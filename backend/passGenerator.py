import bcrypt

password = "admin123"  # change this to whatever you want
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print(hashed.decode('utf-8'))