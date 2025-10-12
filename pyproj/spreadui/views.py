from django.http import HttpResponse
from django.shortcuts import render

from login_required import login_not_required


@login_not_required
def sheet(request):
    return render(request, "spreadui/sheet.html")
