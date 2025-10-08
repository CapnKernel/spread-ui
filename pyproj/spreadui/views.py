from django.http import HttpResponse
from django.shortcuts import render

def sheet(request):
    return render(request, "spreadui/sheet.html")

