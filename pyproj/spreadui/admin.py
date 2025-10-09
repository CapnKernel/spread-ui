from django.contrib import admin
from .models import Person


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'age', 'created_at']
    list_filter = ['age', 'created_at']
    search_fields = ['first_name', 'last_name', 'email']
