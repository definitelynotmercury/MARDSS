from app import app, mail
from flask_mail import Message

with app.app_context():
    msg = Message(
        subject="MARDDS Test Email",
        recipients=["manuelkrispin9@gmail.com"],  # put an email you can check
        body="If you're reading this, Flask-Mail works!"
    )
    mail.send(msg)
    print("Sent!")