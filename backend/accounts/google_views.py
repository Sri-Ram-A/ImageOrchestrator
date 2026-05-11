# backend/accounts/views.py
import requests
from typing import Any, cast
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import GoogleAuthResponseSerializer, UserProfileSerializer

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = GoogleAuthResponseSerializer
    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response(
                {"detail": "Missing Google token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        google_resp = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )

        data = google_resp.json()
        if "error" in data:
            return Response(
                {"detail": "Invalid or expired Google token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        validated = cast(dict[str, Any], serializer.validated_data)

        email = validated["email"].lower()
        given_name = validated.get("given_name", "")
        family_name = validated.get("family_name", "")
        picture = validated.get("picture", "")

        with transaction.atomic():
            user = User.objects.filter(email=email).first()
            if user is None:
                user = User.objects.create_user(
                    username=email.split("@")[0],
                    email=email,
                    password=User.objects.make_random_password(),
                    first_name=given_name,
                    last_name=family_name,
                )

        tokens = get_tokens_for_user(user)
        return Response(
            {
                "user": UserProfileSerializer(user).data,
                "access": tokens["access"],
                "refresh": tokens["refresh"],
            },
            status=status.HTTP_200_OK,
        )
