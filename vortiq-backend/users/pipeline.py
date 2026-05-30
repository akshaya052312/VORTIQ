import os
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken

def save_full_name(backend, user, response, *args, **kwargs):
    if user and (not user.full_name or user.full_name == user.email.split('@')[0]):
        full_name = response.get('name') or \
                    f"{response.get('given_name', '')} {response.get('family_name', '')}".strip() or \
                    user.email.split('@')[0]
        user.full_name = full_name
        user.save()

def generate_jwt_and_redirect(backend, user, *args, **kwargs):
    if user:
        refresh = RefreshToken.for_user(user)
        # Inject custom claims into the access token
        refresh.access_token['email'] = user.email
        refresh.access_token['full_name'] = user.full_name
        
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        backend.strategy.request.session['jwt_access'] = str(access_token)
        backend.strategy.request.session['jwt_refresh'] = str(refresh_token)

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
        return redirect(f"{frontend_url}/dashboard?access={access_token}&refresh={refresh_token}")
