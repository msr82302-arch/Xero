from decimal import Decimal
import uuid

from rest_framework import serializers

from apps.core.money import ZERO_BHD, quantize_bhd
from apps.services.models import Service


class ServiceSerializer(serializers.ModelSerializer):
    code = serializers.CharField(max_length=16, required=False, allow_blank=True)
    benchmark_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=ZERO_BHD,
        coerce_to_string=True,
    )
    description_template = serializers.CharField(
        source="default_description",
        required=False,
        allow_blank=True,
        default="",
    )

    class Meta:
        model = Service
        fields = [
            "id",
            "code",
            "name",
            "category",
            "default_description",
            "description_template",
            "benchmark_price",
            "is_active",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "default_description": {"required": False, "allow_blank": True},
        }

    def validate_name(self, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Service name is required.")
        return cleaned

    def validate_category(self, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Service category is required.")
        return cleaned

    def validate_benchmark_price(self, value: Decimal) -> Decimal:
        quantized = quantize_bhd(value)
        if quantized < ZERO_BHD:
            raise serializers.ValidationError("Benchmark price cannot be negative.")
        return quantized

    def create(self, validated_data):
        code = (validated_data.get("code") or "").strip().upper()
        if not code:
            code = f"SVC-{uuid.uuid4().hex[:6].upper()}"
        validated_data["code"] = code
        validated_data["benchmark_price"] = quantize_bhd(
            validated_data.get("benchmark_price", ZERO_BHD)
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "code" in validated_data:
            code = (validated_data["code"] or "").strip().upper()
            if not code:
                validated_data.pop("code")
            else:
                validated_data["code"] = code
        if "benchmark_price" in validated_data:
            validated_data["benchmark_price"] = quantize_bhd(
                validated_data["benchmark_price"]
            )
        return super().update(instance, validated_data)