# backend/accounts/urls.py

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

urlpatterns = [
    # Registration — returns user + tokens
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    # Login — standard JWT pair (access + refresh)
    path("login/", TokenObtainPairView.as_view(), name="auth-login"),
    # Refresh access token using refresh token
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    # Authenticated user profile
    path("me/", views.MeView.as_view(), name="auth-me"),
]