import factory
from factory.django import DjangoModelFactory
from .models import Person


class PersonFactory(DjangoModelFactory):
    class Meta:
        model = Person

    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    email = factory.LazyAttribute(lambda o: f"{o.first_name.lower()}.{o.last_name.lower()}@example.com")
    age = factory.Faker('random_int', min=18, max=80)
