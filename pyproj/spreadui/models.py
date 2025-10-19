from django.db import models
import uuid


class Person(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    age = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "People"

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class EditingSession(models.Model):
    uuid = models.CharField(max_length=36, unique=True)  # UUID length
    last_keepalive = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_active(self):
        from django.utils import timezone

        return (timezone.now() - self.last_keepalive).seconds < 30  # 30 second timeout

    def __str__(self):
        return f"Session {self.uuid[:8]}..."
