from getpass import getpass

from backend.database import SessionLocal
from backend.models import User
from backend.auth import hash_password


def create_user():

    db = SessionLocal()

    try:
        print("\n=== MPLADS AI Monitor - Create User ===")

        username = input("Enter username: ").strip()

        if not username:
            print("Username cannot be empty.")
            return

        existing_user = db.query(User).filter(
            User.username == username
        ).first()

        if existing_user:
            print("This username already exists.")
            return

        role = input("Enter role (admin/reviewer): ").strip().lower()

        if role not in ["admin", "reviewer"]:
            print("Invalid role. Choose admin or reviewer.")
            return

        password = getpass("Enter password: ")
        confirm_password = getpass("Confirm password: ")

        if len(password) < 12:
            print("Password must contain at least 12 characters.")
            return

        if password != confirm_password:
            print("Passwords do not match.")
            return

        new_user = User(
            username=username,
            password_hash=hash_password(password),
            role=role
        )

        db.add(new_user)
        db.commit()

        print(f"\n{role.capitalize()} account created successfully!")

    except Exception as error:
        db.rollback()
        print("Error creating user:", error)

    finally:
        db.close()


if __name__ == "__main__":
    create_user()