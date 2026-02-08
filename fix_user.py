import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Parent
from werkzeug.security import check_password_hash, generate_password_hash

# Test credentials
test_email = "sandeshkadel2314@gmail.com"
test_password = "Sandesh@123"

with app.app_context():
    # Check if user exists
    parent = Parent.query.filter_by(email=test_email).first()
    
    if parent:
        print(f"✓ User found: {test_email}")
        print(f"  Parent ID: {parent.id}")
        print(f"  Created: {parent.created_at}")
        
        # Check password
        if parent.check_password(test_password):
            print(f"✓ Password CORRECT: {test_password}")
        else:
            print(f"✗ Password INCORRECT")
            print(f"\nResetting password to: {test_password}")
            parent.set_password(test_password)
            db.session.commit()
            print(f"✓ Password reset successful!")
            
            # Verify it works now
            if parent.check_password(test_password):
                print(f"✓ Password verification successful")
            else:
                print(f"✗ Password verification still failing (this shouldn't happen)")
    else:
        print(f"✗ User NOT found: {test_email}")
        print(f"\nCreating new user...")
        
        import uuid
        parent = Parent(
            id=str(uuid.uuid4()),
            email=test_email,
            full_name="Sandesh"
        )
        parent.set_password(test_password)
        
        db.session.add(parent)
        db.session.commit()
        
        print(f"✓ User created successfully!")
        print(f"  Email: {test_email}")
        print(f"  Password: {test_password}")
        print(f"  Parent ID: {parent.id}")
