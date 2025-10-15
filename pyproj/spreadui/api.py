from ninja import NinjaAPI, Schema
from typing import List, Optional
from django.utils import timezone
from django.db.models.functions import Now
from .models import Person, EditingSession

api = NinjaAPI()


def cleanup_expired_sessions():
    """Clean up expired editing sessions (older than 30 seconds)"""
    EditingSession.objects.filter(last_keepalive__lt=Now() - timezone.timedelta(seconds=30)).delete()


class PersonSchema(Schema):
    id: int
    first_name: str
    last_name: str
    email: str
    age: int


class SessionStatusSchema(Schema):
    can_edit: bool
    current_editor: Optional[str] = None
    time_remaining: Optional[int] = None
    session_id: Optional[str] = None


class PersonUpdateSchema(Schema):
    id: int
    first_name: str
    last_name: str
    email: str
    age: int


@api.get("/people", response=List[PersonSchema])
def list_people(request):
    return Person.objects.all()


@api.get("/session/status", response=SessionStatusSchema)
def get_session_status(request):
    # Clean up expired sessions
    cleanup_expired_sessions()

    active_session = EditingSession.objects.first()

    if active_session:
        time_remaining = 30 - (timezone.now() - active_session.last_keepalive).seconds

        # Check if the current request is from the active editor
        is_current_editor = request.session.session_key == active_session.session_key

        return {
            "can_edit": is_current_editor,
            "current_editor": active_session.session_key[:8] + "...",
            "time_remaining": max(0, time_remaining),
            "session_id": active_session.session_key if is_current_editor else None,
        }
    else:
        return {"can_edit": True, "current_editor": None, "time_remaining": None, "session_id": None}


@api.post("/session/keepalive")
def keepalive_session(request):
    """Keepalive endpoint - polled regularly to detect client disappearance"""
    # Just pokes the server - no response needed
    return {"success": True}


@api.post("/session/edit")
def edit_session(request):
    """Edit endpoint - called for user actions to grant/extend editing time"""
    # Ensure session exists (Django creates session on first access)
    if not request.session.session_key:
        request.session.create()

    # Clean up expired sessions
    cleanup_expired_sessions()

    # Check if this user already has an active session
    try:
        session = EditingSession.objects.get(session_key=request.session.session_key)
        # User is the current editor - extend editing time
        session.last_keepalive = timezone.now()
        session.save()
        return {"success": True, "can_edit": True}
    except EditingSession.DoesNotExist:
        # User doesn't have a session - check if they can claim one
        active_session = EditingSession.objects.first()
        if active_session:
            # Someone else is editing
            return {"success": False, "can_edit": False, "message": "Someone else is currently editing"}
        else:
            # No one is editing - create session for this user
            session = EditingSession.objects.create(session_key=request.session.session_key)
            return {"success": True, "can_edit": True}


@api.post("/session/end")
def end_editing_session(request):
    try:
        session = EditingSession.objects.get(session_key=request.session.session_key)
        session.delete()
        return {"success": True}
    except EditingSession.DoesNotExist:
        return {"success": False, "message": "Invalid session"}


@api.put("/people/{person_id}")
def update_person(request, person_id: int, data: PersonUpdateSchema):
    # Verify session is valid
    try:
        session = EditingSession.objects.get(session_key=request.session.session_key)
        if not session.is_active():
            session.delete()
            return {"success": False, "message": "Session expired"}
    except EditingSession.DoesNotExist:
        return {"success": False, "message": "Invalid session"}

    # Update person
    try:
        person = Person.objects.get(id=person_id)
        person.first_name = data.first_name
        person.last_name = data.last_name
        person.email = data.email
        person.age = data.age
        person.save()

        # Update keepalive
        session.last_keepalive = timezone.now()
        session.save()

        return {"success": True}
    except Person.DoesNotExist:
        return {"success": False, "message": "Person not found"}
