
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from backend.database import Base


# Create the Projects table
class Project(Base):

    __tablename__ = "projects"

    # Unique database ID
    id = Column(Integer, primary_key=True, index=True)

    # Project information
    project_id = Column(String, unique=True, nullable=False)
    project_name = Column(String, nullable=False)
    district = Column(String, nullable=False)

    # Financial information
    allocated_budget = Column(Float, nullable=False)
    expenditure = Column(Float, default=0.0)

    # Project timeline
    start_date = Column(String, nullable=False)
    deadline = Column(String, nullable=False)

    # Progress and status
    progress = Column(Integer, default=0)
    status = Column(String, default="Ongoing")



# Evidence table for project photographs
class Evidence(Base):

    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)

    # Link evidence to a project
    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    # Photograph information
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)

    # Verification information
    verification_status = Column(
        String,
        default="Pending Review"
    )

    upload_date = Column(
        String,
        nullable=False
    )

# User table for authentication and role management
class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(
        String,
        unique=True,
        nullable=False
    )

    password_hash = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        nullable=False
    )