from django.contrib import admin
from .models import Person, EditingSession


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'age', 'created_at']
    list_filter = ['age', 'created_at']
    search_fields = ['first_name', 'last_name', 'email']


@admin.register(EditingSession)
class EditingSessionAdmin(admin.ModelAdmin):
    list_display = ['session_key', 'last_keepalive', 'created_at', 'is_active']
    list_filter = ['created_at', 'last_keepalive']
    search_fields = ['session_key']
    readonly_fields = ['session_key', 'created_at']

    def is_active(self, obj):
        return obj.is_active()

    is_active.boolean = True
    is_active.short_description = 'Active'
