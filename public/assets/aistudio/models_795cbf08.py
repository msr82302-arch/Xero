#### File: `backend/apps/services/models.py`

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from apps.core.models import TimestampedUUIDModel
from apps.core.money import ZERO_BHD, quantize_bhd


class Service(TimestampedUUIDModel):
    code = models.CharField(max_length=16, unique=True)
    name = models.CharField(max_length=160, unique=True)
    category = models.CharField(max_length=80, db_index=True)
    default_description = models.TextField(blank=True, default="")
    benchmark_price = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=ZERO_BHD,
        validators=[MinValueValidator(ZERO_BHD)],
    )
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "services"
        ordering = ["display_order", "name"]
        constraints = [
            models.CheckConstraint(
                condition=Q(benchmark_price__gte=ZERO_BHD),
                name="chk_services_benchmark_price_nonneg",
            ),
        ]

    def save(self, *args, **kwargs):
        self.benchmark_price = quantize_bhd(self.benchmark_price)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"[{self.code}] {self.name} ({self.benchmark_price} BHD)"

