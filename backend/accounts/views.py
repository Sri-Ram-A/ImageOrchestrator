# backend/accounts/views.py
from typing import cast
from django.contrib.auth.models import AbstractBaseUser
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserProfileSerializer


class RegisterView(APIView):
    """POST /api/auth/register/ — create a new user and return JWT tokens."""

    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = cast(AbstractBaseUser, serializer.save())
        # Issue tokens immediately so the user is logged-in after registration.
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserProfileSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """GET /api/auth/me/ — return the authenticated user's profile."""

    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get(self, request):
        serializer = self.serializer_class(request.user)
        return Response(serializer.data)

