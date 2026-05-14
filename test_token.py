import jwt
import time

def test_token():
    api_key = "test_key"
    secret = "test_secret"
    iat = int(time.time())
    exp = iat + 3600
    payload = {
        "apikey": api_key,
        "permissions": ["allow_join", "allow_mod"],
        "iat": iat,
        "exp": exp
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    print(f"Token type: {type(token)}")
    print(f"Token: {token}")

if __name__ == "__main__":
    test_token()
