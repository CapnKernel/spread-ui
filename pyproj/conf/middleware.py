import zoneinfo

from django.conf import settings
from django.utils import timezone


class TimezoneMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tzname = settings.TIME_ZONE
        if tzname:
            timezone.activate(zoneinfo.ZoneInfo(tzname))

        return self.get_response(request)
