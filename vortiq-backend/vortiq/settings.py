"""
Django settings for Vortiq project.

All sensitive values are read from environment variables via python-dotenv.
Copy .env.example to .env and fill in your values before running.
"""

import os
import sys
from pathlib import Path
from datetime import timedelta

# Mock fcntl on Windows for django-crontab compatibility
if sys.platform == 'win32':
    import types
    mock_fcntl = types.ModuleType('fcntl')
    mock_fcntl.fcntl = lambda fd, op, arg=0: 0
    mock_fcntl.ioctl = lambda fd, op, arg=0, mutate_flag=False: 0
    mock_fcntl.flock = lambda fd, op: 0
    mock_fcntl.lockf = lambda fd, op, length=0, start=0, whence=0: 0
    sys.modules['fcntl'] = mock_fcntl

from dotenv import load_dotenv

# ──────────────────────────────────────────────
# Paths & Environment
# ──────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

# ──────────────────────────────────────────────
# Core Settings
# ──────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY")

DEBUG = True

ALLOWED_HOSTS = ['*']

# ──────────────────────────────────────────────
# Installed Apps
# ──────────────────────────────────────────────

INSTALLED_APPS = [
    # Daphne must be first so it overrides the runserver command
    "daphne",
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "channels",
    # Local apps
    "users.apps.UsersConfig",
    "meetings.apps.MeetingsConfig",
    "transcriptions.apps.TranscriptionsConfig",
    "social_django",
    "django_crontab",
]

CRONJOBS = [
    ('*/5 * * * *', 'vortiq.cron.keep_alive', '>> /tmp/vortiq_cron.log 2>&1'),
    ('0 2 * * *', 'vortiq.cron.cleanup_failed_meetings', '>> /tmp/vortiq_cron.log 2>&1'),
]

# ──────────────────────────────────────────────
# Middleware
# ──────────────────────────────────────────────

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ──────────────────────────────────────────────
# URL Configuration
# ──────────────────────────────────────────────

ROOT_URLCONF = "vortiq.urls"

# ──────────────────────────────────────────────
# Templates
# ──────────────────────────────────────────────

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ──────────────────────────────────────────────
# WSGI / ASGI
# ──────────────────────────────────────────────

WSGI_APPLICATION = "vortiq.wsgi.application"

# Channels replaces the default runserver with Daphne (ASGI).
# HTTP traffic is still handled by Django's standard ASGI handler;
# WebSocket traffic is routed through Channels (see vortiq/asgi.py).
ASGI_APPLICATION = "vortiq.asgi.application"

# ──────────────────────────────────────────────
# Database — PostgreSQL via DATABASE_URL
# ──────────────────────────────────────────────

import dj_database_url
import os

db_url = os.environ.get('DATABASE_URL', '')
is_postgres = db_url.startswith('postgres') or db_url.startswith('postgresql')

DATABASES = {
    'default': dj_database_url.config(
        default=db_url,
        conn_max_age=600,
        ssl_require=is_postgres,
    )
}

# ──────────────────────────────────────────────
# Password Validation
# ──────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ──────────────────────────────────────────────
# Internationalization
# ──────────────────────────────────────────────

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ──────────────────────────────────────────────
# Static & Media Files
# ──────────────────────────────────────────────

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# ──────────────────────────────────────────────
# Default Primary Key
# ──────────────────────────────────────────────

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ──────────────────────────────────────────────
# Django REST Framework
# ──────────────────────────────────────────────

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

# ──────────────────────────────────────────────
# Simple JWT
# ──────────────────────────────────────────────

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# ──────────────────────────────────────────────
# CORS
# ──────────────────────────────────────────────

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://vortiq-zeta\.vercel\.app$",
    r"^https://vortiq-.*\.vercel\.app$",
    r"^http://localhost:\d+$",
]

CORS_ALLOW_CREDENTIALS = True



# ──────────────────────────────────────────────
# Custom User Model & Auth Backend
# ──────────────────────────────────────────────

AUTH_USER_MODEL = "users.CustomUser"

AUTHENTICATION_BACKENDS = [
    "social_core.backends.google.GoogleOAuth2",
    "users.backends.EmailBackend",
    "django.contrib.auth.backends.ModelBackend",
]

# ──────────────────────────────────────────────
# Groq AI
# ──────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ──────────────────────────────────────────────
# Django Channels — Redis Channel Layer
# ──────────────────────────────────────────────

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
if redis_url.startswith("rediss://"):
    import ssl
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [{
                    "address": redis_url,
                    "ssl": ssl_context,
                }],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [redis_url],
            },
        },
    }

# ──────────────────────────────────────────────
# Slack Integration Settings
# ──────────────────────────────────────────────

SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID", "")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET", "")
SLACK_REDIRECT_URI = os.getenv("SLACK_REDIRECT_URI", "")

# ──────────────────────────────────────────────
# Notion Integration Settings
# ──────────────────────────────────────────────

NOTION_CLIENT_ID = os.getenv("NOTION_CLIENT_ID", "")
NOTION_CLIENT_SECRET = os.getenv("NOTION_CLIENT_SECRET", "")
NOTION_REDIRECT_URI = os.getenv("NOTION_REDIRECT_URI", "")

# ──────────────────────────────────────────────
# Google Integration Settings
# ──────────────────────────────────────────────

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")

# Google OAuth2 settings (social-auth-app-django)
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.getenv("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY", "")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.getenv("SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET", "")
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ["email", "profile"]
SOCIAL_AUTH_GOOGLE_OAUTH2_IGNORE_DEFAULT_SCOPE = False
SOCIAL_AUTH_LOGIN_REDIRECT_URL = '/api/auth/google/token/'
SOCIAL_AUTH_USER_MODEL = "users.CustomUser"
SOCIAL_AUTH_USER_FIELDS = ["email", "full_name"]
SOCIAL_AUTH_USERNAME_IS_FULL_EMAIL = True

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.social_auth.associate_by_email',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.user.create_user',
    'users.pipeline.set_full_name',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
    'users.pipeline.generate_jwt_and_redirect',
)

# Frontend URL for redirecting after OAuth callback
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'ERROR',
    },
}

# ──────────────────────────────────────────────
# Cloudinary Settings
# ──────────────────────────────────────────────
import cloudinary

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)
