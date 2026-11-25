"""from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import (
    EnforceStaffDevicePolicy,
    IsActiveAndPasswordUpdated,
    IsAdministrator,
    IsStaffOperational,
)
from apps.services.models import Service
from apps.services_catalog.serializers import ServiceSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    """
    12-Service Corporate Catalog API (/api/v1/services/).
    - GET (list/retrieve): ADMINISTRATOR and STAFF (IsStaffOperational)
    - POST/PUT/PATCH/DELETE: ADMINISTRATOR only (IsAdministrator)
    """

    queryset = Service.objects.all().order_by("display_order", "name")
    serializer_class = ServiceSerializer
    filterset_fields = ["category", "is_active"]
    search_fields = ["code", "name", "category", "default_description"]
    ordering_fields = ["display_order", "name", "category", "benchmark_price", "created_at"]
    ordering = ["display_order", "name"]

    def get_permissions(self):
        base = [
            IsAuthenticated(),
            IsActiveAndPasswordUpdated(),
            EnforceStaffDevicePolicy(),
        ]
        if self.action in ("list", "retrieve"):
            return base + [IsStaffOperational()]
        return base + [IsAdministrator()]
    

from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.accounts.permissions import (
    EnforceStaffDevicePolicy,
    IsActiveAndPasswordUpdated,
    IsAdministrator,
)
from apps.services.models import Service
from apps.services_catalog.serializers import ServiceSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    """
    12-Service Corporate Catalog API (/api/v1/services/).
    - GET (list/retrieve): Public read-only access (AllowAny) for Portfolio & Estimator.
    - POST/PUT/PATCH/DELETE: Authenticated ADMINISTRATOR only.
    """

    queryset = Service.objects.all().order_by("display_order", "name")
    serializer_class = ServiceSerializer
    filterset_fields = ["category", "is_active"]
    search_fields = ["code", "name", "category", "default_description"]
    ordering_fields = ["display_order", "name", "category", "benchmark_price", "created_at"]
    ordering = ["display_order", "name"]

    def get_permissions(self):
        # 1. Public Portfolio Access: Anyone can read services catalog
        if self.action in ("list", "retrieve"):
            return [AllowAny()]

        # 2. Administrative Mutation Guard: Only authenticated Admins can edit/add/delete
        return [
            IsAuthenticated(),
            IsActiveAndPasswordUpdated(),
            EnforceStaffDevicePolicy(),
            IsAdministrator(),
            
        ]
        
"""

from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import (
    EnforceStaffDevicePolicy,
    IsActiveAndPasswordUpdated,
    IsAdministrator,
)
from apps.services.models import Service
from apps.services_catalog.serializers import ServiceSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    """
    12-Service Corporate Catalog API (/api/v1/services/).
    - GET (list/retrieve): 100% Public Access (AllowAny, No Authentication required).
    - POST/PUT/PATCH/DELETE: Authenticated ADMINISTRATOR only.
    """

    queryset = Service.objects.all().order_by("display_order", "name")
    serializer_class = ServiceSerializer
    filterset_fields = ["category", "is_active"]
    search_fields = ["code", "name", "category", "default_description"]
    ordering_fields = ["display_order", "name", "category", "benchmark_price", "created_at"]
    ordering = ["display_order", "name"]

    def get_permissions(self):
        """Allow public read-only access; require Admin for changes."""
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [
            IsAuthenticated(),
            IsActiveAndPasswordUpdated(),
            EnforceStaffDevicePolicy(),
            IsAdministrator(),
        ]

    def get_authenticators(self):
        """
        Completely remove authentication classes for list and retrieve actions.
        This stops DRF from rejecting missing/anonymous credentials with 401.
        """
        if self.request and self.request.method == "GET":
            return []
        return super().get_authenticators()

    def initial(self, request, *args, **kwargs):
        """
        Ensure unauthenticated GET requests skip DRF authentication checks.
        """
        if request.method == "GET":
            self.authentication_classes = []
        super().initial(request, *args, **kwargs)