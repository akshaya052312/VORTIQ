from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from .serializers import PasswordResetRequestSerializer, PasswordResetConfirmSerializer, token_generator


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/request/
    Sends a reset link to the given email if an account exists.
    Always returns 200 regardless of whether the email exists,
    to avoid leaking which emails are registered.
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = token_generator.make_token(user)
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
            reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"

            send_mail(
                subject="Reset your Vortiq password",
                message=f"Click the link to reset your password: {reset_link}\n\nIf you didn't request this, ignore this email.",
                from_email=None,  # uses DEFAULT_FROM_EMAIL
                recipient_list=[user.email],
                fail_silently=False,
            )

        return Response(
            {"message": "If an account with that email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Sets a new password given a valid uid + token.
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)