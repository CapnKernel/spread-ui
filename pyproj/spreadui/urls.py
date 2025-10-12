from django.urls import path
from . import views
from .api import api

app_name = "spreadui"

urlpatterns = [
    path("", views.sheet, name="sheet"),
    path("api/", api.urls),
]
