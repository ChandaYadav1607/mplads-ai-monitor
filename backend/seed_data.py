
from backend.database import SessionLocal
from backend.models import Project

# Create database session
db = SessionLocal()

# Sample MPLADS projects
sample_projects = [
    {
        "project_id": "MPL001",
        "project_name": "Village Road Construction",
        "district": "Deoria",
        "allocated_budget": 1000000,
        "expenditure": 700000,
        "start_date": "2026-06-01",
        "deadline": "2027-01-30",
        "progress": 70,
        "status": "Ongoing"
    },
    {
        "project_id": "MPL002",
        "project_name": "School Building Construction",
        "district": "Gorakhpur",
        "allocated_budget": 1500000,
        "expenditure": 1650000,
        "start_date": "2026-03-01",
        "deadline": "2026-10-15",
        "progress": 45,
        "status": "Ongoing"
    },
    {
        "project_id": "MPL003",
        "project_name": "Water Tank Construction",
        "district": "Lucknow",
        "allocated_budget": 800000,
        "expenditure": 200000,
        "start_date": "2026-08-01",
        "deadline": "2027-03-01",
        "progress": 20,
        "status": "Ongoing"
    },
    {
        "project_id": "MPL004",
        "project_name": "Street Light Installation",
        "district": "Varanasi",
        "allocated_budget": 500000,
        "expenditure": 450000,
        "start_date": "2026-02-01",
        "deadline": "2026-09-30",
        "progress": 30,
        "status": "Ongoing"
    },
    {
        "project_id": "MPL005",
        "project_name": "Community Hall Construction",
        "district": "Deoria",
        "allocated_budget": 2000000,
        "expenditure": 1200000,
        "start_date": "2026-05-01",
        "deadline": "2026-12-20",
        "progress": 80,
        "status": "Ongoing"
    },
    {
        "project_id": "MPL006",
        "project_name": "Drainage System Construction",
        "district": "Kanpur",
        "allocated_budget": 1200000,
        "expenditure": 900000,
        "start_date": "2026-04-01",
        "deadline": "2027-02-15",
        "progress": 25,
        "status": "Ongoing"
    },
    {
        "project_id": "MPL007",
        "project_name": "Health Centre Construction",
        "district": "Prayagraj",
        "allocated_budget": 1800000,
        "expenditure": 1900000,
        "start_date": "2026-01-01",
        "deadline": "2026-08-01",
        "progress": 100,
        "status": "Completed"
    },
    {
        "project_id": "MPL008",
        "project_name": "Public Park Development",
        "district": "Ayodhya",
        "allocated_budget": 900000,
        "expenditure": 100000,
        "start_date": "2026-09-01",
        "deadline": "2026-12-01",
        "progress": 10,
        "status": "Ongoing"
    }
]

try:
    for project_data in sample_projects:
        existing_project = db.query(Project).filter(
            Project.project_id == project_data["project_id"]
        ).first()

        if not existing_project:
            project = Project(**project_data)
            db.add(project)

    db.commit()
    print("Sample projects inserted successfully!")

except Exception as e:
    db.rollback()
    print("Error:", e)

finally:
    db.close()
