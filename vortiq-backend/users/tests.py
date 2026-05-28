from django.test import TestCase
from django.urls import reverse
from unittest.mock import MagicMock
from users.models import CustomUser
from users.pipeline import set_full_name, generate_jwt_and_redirect

class PipelineTestCase(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="testuser@example.com",
            password="testpassword123",
            full_name=""
        )

    def test_set_full_name_from_response(self):
        # Case 1: user.full_name is empty, response has both given_name and family_name
        response = {
            'given_name': 'John',
            'family_name': 'Doe'
        }
        set_full_name(backend=None, user=self.user, response=response)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "John Doe")

    def test_set_full_name_fallback_to_email(self):
        # Case 2: user.full_name is empty, response has no name info
        response = {}
        set_full_name(backend=None, user=self.user, response=response)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "testuser@example.com")

    def test_set_full_name_preserves_existing_name(self):
        # Case 3: user.full_name is already set, it should not be overwritten
        self.user.full_name = "Jane Smith"
        self.user.save()
        
        response = {
            'given_name': 'John',
            'family_name': 'Doe'
        }
        set_full_name(backend=None, user=self.user, response=response)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Jane Smith")

    def test_generate_jwt_and_redirect(self):
        # Mock backend structure
        mock_backend = MagicMock()
        mock_session = {}
        mock_backend.strategy.request.session = mock_session

        generate_jwt_and_redirect(backend=mock_backend, user=self.user)

        self.assertIn('jwt_access', mock_session)
        self.assertIn('jwt_refresh', mock_session)

    def test_google_auth_token_view_success(self):
        session = self.client.session
        session['jwt_access'] = 'test_access_token'
        session['jwt_refresh'] = 'test_refresh_token'
        session.save()

        response = self.client.get(reverse('google-auth-token'))
        
        # Verify redirect to dashboard with tokens
        self.assertEqual(response.status_code, 302)
        self.assertIn('http://localhost:5173/dashboard?access=test_access_token&refresh=test_refresh_token', response['Location'])

        # Verify tokens are cleared from the session
        self.assertNotIn('jwt_access', self.client.session)
        self.assertNotIn('jwt_refresh', self.client.session)

    def test_google_auth_token_view_missing_tokens(self):
        response = self.client.get(reverse('google-auth-token'))
        
        # Verify redirect to login with auth_failed error
        self.assertEqual(response.status_code, 302)
        self.assertIn('http://localhost:5173/login?error=auth_failed', response['Location'])
