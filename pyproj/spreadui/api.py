from ninja import NinjaAPI, Schema
from typing import List
from .models import Person

api = NinjaAPI()


class PersonSchema(Schema):
    id: int
    first_name: str
    last_name: str
    email: str
    age: int


@api.get("/people", response=List[PersonSchema])
def list_people(request):
    return list(Person.objects.all())
