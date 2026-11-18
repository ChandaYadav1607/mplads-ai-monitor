from fastapi import FastAPI, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, model_validator, Field
from sqlalchemy.orm import Session

from backend.database import SessionLocal, Base, engine
from backend.models import Project, Evidence, User
from backend.auth import (
    verify_password,
    create_access_token,
    decode_access_token
)

from sqlalchemy import func

from datetime import date

from fastapi import UploadFile, File, HTTPException
from pathlib import Path
from datetime import datetime
import shutil

from fastapi.staticfiles import StaticFiles

from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from PIL import UnidentifiedImageError
# Authentication security scheme
security = HTTPBearer()

# Structure for creating a new project
# Structure for creating a new project
class ProjectCreate(BaseModel):
    project_id: str
    project_name: str
    district: str
    allocated_budget: float = Field(ge=0)
    expenditure: float = Field(ge=0)
    start_date: date
    deadline: date
    progress: int = Field(ge=0, le=100)
    status: str = Field(pattern="^(Ongoing|Completed|Pending)$")
    @model_validator(mode="after")
    def check_dates(self):
            if self.deadline < self.start_date:
                raise ValueError("Deadline cannot be earlier than start date")
            return self

# Structure for updating an existing project
class ProjectUpdate(BaseModel):
    project_name: str
    district: str
    allocated_budget: float = Field(ge=0)
    expenditure: float = Field(ge=0)
    start_date: date
    deadline: date
    progress: int = Field(ge=0, le=100)
    status: str = Field(pattern="^(Ongoing|Completed|Pending)$")
    @model_validator(mode="after")
    def check_dates(self):
        if self.deadline < self.start_date:
            raise ValueError("Deadline cannot be earlier than start date")
        return self 
# Structure for user login
class LoginRequest(BaseModel):

    username: str
    password: str

# Create database tables if they do not already exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MPLADS AI Monitor",
    description="Project Monitoring and Anomaly Detection System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "https://mplads-ai-monitor-23mc.onrender.com"
],
    allow_methods=["*"],
    allow_headers=["*"]
)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)


# Database connection for each API request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Get the currently logged-in user
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired login session"
        )

    username = payload.get("sub")

    user = db.query(User).filter(
        User.username == username
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# Check whether the user has the required role
def require_role(*allowed_roles):

    def role_checker(
        current_user: User = Depends(get_current_user)
    ):

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action"
            )

        return current_user

    return role_checker


# Home route
@app.get("/")
def home():
    return {
        "message": "Welcome to MPLADS AI Monitor!",
        "status": "Backend is running successfully"
    }


# Project information route
@app.get("/project-info")
def project_info():
    return {
        "project_name": "MPLADS AI Monitor",
        "total_modules": 5,
        "modules": [
            "Project Monitoring Dashboard",
            "Project Management",
            "Anomaly Detection",
            "Risk Analysis and Alerts",
            "Photo and Evidence Verification"
        ]
    }


# Fetch all projects from the database
@app.get("/projects")
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()

    return [
        {
            "id": project.id,
            "project_id": project.project_id,
            "project_name": project.project_name,
            "district": project.district,
            "allocated_budget": project.allocated_budget,
            "expenditure": project.expenditure,
            "start_date": project.start_date,
            "deadline": project.deadline,
            "progress": project.progress,
            "status": project.status
        }
        for project in projects
    ]

@app.post("/projects")
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):

    # Check whether project ID already exists
    existing_project = db.query(Project).filter(
        Project.project_id == project.project_id
    ).first()

    if existing_project:
        raise HTTPException(
            status_code=400,
            detail="Project ID already exists"
        )

    # Create new project
    new_project = Project(**project.model_dump(mode="json"))

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return {
        "message": "Project created successfully",
        "project": {
            "project_id": new_project.project_id,
            "project_name": new_project.project_name,
            "district": new_project.district
        }
    }

# Update an existing project
@app.put("/projects/{project_id}")
def update_project(
    project_id: str,
    project: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    existing_project = db.query(Project).filter(
        Project.project_id == project_id
    ).first()

    if not existing_project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    # Update project details
    for key, value in project.model_dump(mode="json").items():
        setattr(existing_project, key, value)

    db.commit()
    db.refresh(existing_project)

    return {
        "message": "Project updated successfully",
        "project_id": existing_project.project_id
    }

# Fetch one project using its database ID
@app.get("/projects/{project_id}")


def get_single_project(project_id: str, db: Session = Depends(get_db)):

    project = db.query(Project).filter(
        Project.project_id == project_id
    ).first()

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    return {
        "id": project.id,
        "project_id": project.project_id,
        "project_name": project.project_name,
        "district": project.district,
        "allocated_budget": project.allocated_budget,
        "expenditure": project.expenditure,
        "start_date": project.start_date,
        "deadline": project.deadline,
        "progress": project.progress,
        "status": project.status
    }


# Search projects by district
@app.get("/projects/search/{district}")
def search_projects(district: str, db: Session = Depends(get_db)):

    projects = db.query(Project).filter(
        Project.district.ilike(f"%{district}%")
    ).all()

    return [
        {
            "project_id": project.project_id,
            "project_name": project.project_name,
            "district": project.district,
            "status": project.status,
            "progress": project.progress
        }
        for project in projects
    ]



# Filter projects by status
@app.get("/projects/status/{status}")
def filter_projects_by_status(
    status: str,
    db: Session = Depends(get_db)
):

    projects = db.query(Project).filter(
        Project.status.ilike(status)
    ).all()

    return [
        {
            "project_id": project.project_id,
            "project_name": project.project_name,
            "district": project.district,
            "status": project.status,
            "progress": project.progress
        }
        for project in projects
    ]



# Dashboard statistics API
@app.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):

    total_projects = db.query(Project).count()

    completed_projects = db.query(Project).filter(
        Project.status.ilike("Completed")
    ).count()

    ongoing_projects = db.query(Project).filter(
        Project.status.ilike("Ongoing")
    ).count()

    total_budget = db.query(
        func.sum(Project.allocated_budget)
    ).scalar() or 0

    total_expenditure = db.query(
        func.sum(Project.expenditure)
    ).scalar() or 0

    average_progress = db.query(
        func.avg(Project.progress)
    ).scalar() or 0

    return {
        "total_projects": total_projects,
        "completed_projects": completed_projects,
        "ongoing_projects": ongoing_projects,
        "total_allocated_budget": total_budget,
        "total_expenditure": total_expenditure,
        "average_progress": round(average_progress, 2)
    }


# District-wise project statistics
@app.get("/dashboard/district-stats")
def district_stats(db: Session = Depends(get_db)):

    results = db.query(
        Project.district,
        func.count(Project.id).label("total_projects"),
        func.sum(Project.allocated_budget).label("total_budget"),
        func.sum(Project.expenditure).label("total_expenditure")
    ).group_by(Project.district).all()

    return [
        {
            "district": result.district,
            "total_projects": result.total_projects,
            "total_budget": result.total_budget or 0,
            "total_expenditure": result.total_expenditure or 0
        }
        for result in results
    ]



# Anomaly Detection API
@app.get("/anomalies")
def detect_anomalies(db: Session = Depends(get_db)):

    projects = db.query(Project).all()
    anomaly_results = []

    for project in projects:

        anomalies = []

        # Check 1: Budget overrun
        if project.expenditure > project.allocated_budget:
            anomalies.append({
                "type": "Budget Overrun",
                "message": "Expenditure exceeds allocated budget."
            })

        # Check 2: Project delay
        if project.status.lower() != "completed":
            deadline = date.fromisoformat(project.deadline)

            if deadline < date.today():
                anomalies.append({
                    "type": "Project Delay",
                    "message": "Project deadline has passed but project is not completed."
                })

        # Check 3: Expenditure and progress mismatch
        if project.allocated_budget > 0:
            expenditure_percentage = (
                project.expenditure / project.allocated_budget
            ) * 100

            difference = abs(
                expenditure_percentage - project.progress
            )

            if difference > 30:
                anomalies.append({
                    "type": "Progress Mismatch",
                    "message": (
                        "Expenditure percentage and physical progress "
                        "differ by more than 30 percentage points."
                    )
                })

        # Check 4: Missing information
        required_fields = {
            "project_name": project.project_name,
            "district": project.district,
            "start_date": project.start_date,
            "deadline": project.deadline
        }

        missing_fields = [
            field for field, value in required_fields.items()
            if not value
        ]

        if missing_fields:
            anomalies.append({
                "type": "Missing Information",
                "message": "Missing fields: " + ", ".join(missing_fields)
            })

        # Include only projects with detected anomalies
        if anomalies:
            anomaly_results.append({
                "project_id": project.project_id,
                "project_name": project.project_name,
                "district": project.district,
                "anomaly_count": len(anomalies),
                "anomalies": anomalies
            })

    return {
        "total_projects_checked": len(projects),
        "projects_with_anomalies": len(anomaly_results),
        "anomaly_details": anomaly_results
    }



# Risk Analysis API
@app.get("/risk-analysis")
def risk_analysis(db: Session = Depends(get_db)):

    projects = db.query(Project).all()
    risk_results = []

    for project in projects:

        risk_score = 0
        risk_reasons = []

        # Check 1: Budget overrun
        if project.expenditure > project.allocated_budget:
            risk_score += 40
            risk_reasons.append("Budget Overrun (+40)")

        # Check 2: Project delay
        if project.status.lower() != "completed":
            deadline = date.fromisoformat(project.deadline)

            if deadline < date.today():
                risk_score += 30
                risk_reasons.append("Project Delay (+30)")

        # Check 3: Progress mismatch
        if project.allocated_budget > 0:
            expenditure_percentage = (
                project.expenditure / project.allocated_budget
            ) * 100

            difference = abs(
                expenditure_percentage - project.progress
            )

            if difference > 30:
                risk_score += 20
                risk_reasons.append("Progress Mismatch (+20)")

        # Check 4: Missing information
        required_fields = [
            project.project_name,
            project.district,
            project.start_date,
            project.deadline
        ]

        if any(not field for field in required_fields):
            risk_score += 10
            risk_reasons.append("Missing Information (+10)")

        # Determine risk category
        if risk_score >= 60:
            risk_level = "High"
        elif risk_score >= 30:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        risk_results.append({
            "project_id": project.project_id,
            "project_name": project.project_name,
            "district": project.district,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_reasons": risk_reasons
        })

    return {
        "total_projects_analyzed": len(projects),
        "risk_analysis": risk_results
    }



# Risk Alerts API
@app.get("/risk-alerts")
def risk_alerts(db: Session = Depends(get_db)):

    results = risk_analysis(db)

    alerts = [
        project
        for project in results["risk_analysis"]
        if project["risk_level"] in ["High", "Medium"]
    ]

    return {
        "total_alerts": len(alerts),
        "message": "Projects requiring attention",
        "alerts": alerts
    }



# Photo Upload API
@app.post("/upload-evidence/{project_id}")
def upload_evidence(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "reviewer"))
):

    # Check project exists
    project = db.query(Project).filter(
        Project.id == project_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Check file size (maximum 5 MB)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > 5 * 1024 * 1024:
        raise HTTPException(
        status_code=400,
        detail="File size must not exceed 5 MB."
    )
    # Validate actual image content using Pillow
    try:
        image = Image.open(file.file)

        if image.format not in ["JPEG", "PNG", "WEBP"]:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG and WEBP images are allowed"
            )

        image.verify()
        file.file.seek(0)

    except (UnidentifiedImageError, OSError, SyntaxError):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a valid image."
        )

    # Your existing filename and file-saving code continues here
    # Create unique filename
    filename = f"{project.project_id}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{Path(file.filename).name}"

    # Find uploads folder
    base_dir = Path(__file__).resolve().parent.parent
    upload_dir = base_dir / "uploads"
    upload_dir.mkdir(exist_ok=True)

    file_path = upload_dir / filename

    # Save photograph
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Save photograph information in database
    evidence = Evidence(
        project_id=project.id,
        filename=filename,
        file_path=str(file_path),
        verification_status="Pending Review",
        upload_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )

    try:
        db.add(evidence)
        db.commit()
        db.refresh(evidence)

        return {
            "message": "Evidence uploaded successfully!",
            "evidence_id": evidence.id,
            "project_id": project.project_id,
            "filename": evidence.filename,
            "verification_status": evidence.verification_status
        }

    except Exception:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Could not save evidence information"
        )

    finally:
        file.file.close()



# View evidence for a particular project
@app.get("/evidence/{project_id}")
def get_project_evidence(
    project_id: int,
    db: Session = Depends(get_db)
):

    project = db.query(Project).filter(
        Project.id == project_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    evidence_records = db.query(Evidence).filter(
        Evidence.project_id == project.id
    ).all()

    return {
        "project_id": project.project_id,
        "project_name": project.project_name,
        "total_evidence": len(evidence_records),
        "evidence": [
            {
                "evidence_id": item.id,
                "filename": item.filename,
                "file_path": item.file_path,
                "verification_status": item.verification_status,
                "upload_date": item.upload_date
            }
            for item in evidence_records
        ]
    }

# Verify project evidence
@app.put("/verify-evidence/{evidence_id}")
def verify_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "admin"))
):

    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id
    ).first()

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found"
        )

    evidence.verification_status = "Verified"

    db.commit()
    db.refresh(evidence)

    return {
        "message": "Evidence verified successfully!",
        "evidence_id": evidence.id,
        "filename": evidence.filename,
        "verification_status": evidence.verification_status
    }


# Get evidence from all projects
@app.get("/all-evidence")
def get_all_evidence(db: Session = Depends(get_db)):

    evidence_records = db.query(Evidence).all()

    result = []

    for evidence in evidence_records:

        project = db.query(Project).filter(
            Project.id == evidence.project_id
        ).first()

        result.append({
            "evidence_id": evidence.id,
            "project_id": project.project_id,
            "project_name": project.project_name,
            "filename": evidence.filename,
            "file_path": evidence.file_path,
            "verification_status": evidence.verification_status,
            "upload_date": evidence.upload_date
        })

    return {
        "total_evidence": len(result),
        "evidence": result
    }

# Find projects without uploaded evidence
@app.get("/projects-without-evidence")
def projects_without_evidence(db: Session = Depends(get_db)):

    projects = db.query(Project).all()

    projects_without_photos = []

    for project in projects:

        evidence = db.query(Evidence).filter(
            Evidence.project_id == project.id
        ).first()

        if not evidence:
            projects_without_photos.append({
                "project_id": project.project_id,
                "project_name": project.project_name,
                "district": project.district,
                "status": project.status
            })

    return {
        "total_projects_without_evidence": len(projects_without_photos),
        "projects": projects_without_photos
    }

# Delete an existing project
@app.delete("/projects/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    existing_project = db.query(Project).filter(
        Project.project_id == project_id
    ).first()

    if not existing_project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    # Prevent deletion if evidence is linked to this project
    linked_evidence = db.query(Evidence).filter(
        Evidence.project_id == existing_project.id
    ).first()

    if linked_evidence:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete this project because evidence is linked to it."
        )

    db.delete(existing_project)
    db.commit()

    return {
        "message": "Project deleted successfully",
        "project_id": project_id
    }

# User Login API
@app.post("/login")
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):

    # Find user by username
    user = db.query(User).filter(
        User.username == login_data.username
    ).first()

    # Check username and password
    if not user or not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # Generate login token
    access_token = create_access_token(
        username=user.username,
        role=user.role
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }