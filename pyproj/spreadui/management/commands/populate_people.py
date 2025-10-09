from django.core.management.base import BaseCommand
from spreadui.factories import PersonFactory
from spreadui.models import Person


class Command(BaseCommand):
    help = 'Populate People table with specified number of entries'

    def add_arguments(self, parser):
        parser.add_argument('count', type=int, help='Number of people to create')

    def handle(self, *args, **options):
        count = options['count']

        Person.objects.all().delete()

        PersonFactory.create_batch(count)

        self.stdout.write(self.style.SUCCESS(f'Successfully created {count} people'))
