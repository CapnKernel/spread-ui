from django.urls import path
from . import views

app_name = "spreadui"

urlpatterns = [
    path("", views.sheet, name="sheet"),
]
