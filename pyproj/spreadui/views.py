from django.http import HttpResponse
from django.shortcuts import render

from login_required import login_not_required
from .models import Person


@login_not_required
def sheet(request):
    people = Person.objects.all()
    return render(request, "spreadui/sheet.html", {'people': people})
