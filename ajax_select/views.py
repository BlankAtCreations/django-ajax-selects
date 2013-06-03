import os
from ajax_select import get_lookup
from django.contrib.admin import site
from django.contrib.auth.decorators import permission_required
from django.db import models
from django.http import HttpResponse
from django.utils import simplejson
from django.conf import settings


def ajax_lookup(request, channel):
    """ this view supplies results for foreign keys and many to many fields """

    # it should come in as GET unless global $.ajaxSetup({type:"POST"}) has been set
    # in which case we'll support POST
    if request.method == "GET":
        # we could also insist on an ajax request
        if 'term' not in request.GET:
            return HttpResponse('')
        query = request.GET['term']
    else:
        if 'term' not in request.POST:
            return HttpResponse('') # suspicious
        query = request.POST['term']

    lookup = get_lookup(channel)
    if hasattr(lookup, 'check_auth'):
        lookup.check_auth(request)

    if len(query) >= getattr(lookup, 'min_length', 1):
        instances = lookup.get_query(query, request)
    else:
        instances = []

    results = simplejson.dumps([
        {
            'pk': unicode(getattr(item, 'pk', None)),
            'value': lookup.get_result(item),
            'match': lookup.format_match(item),
            'repr': lookup.format_item_display(item)
        } for item in instances
    ])

    return HttpResponse(results, mimetype='application/javascript')


def add_popup(request, app_label, model):
    """ this presents the admin site popup add view (when you click the green +)

        make sure that you have added ajax_select.urls to your urls.py:
            (r'^ajax_select/', include('ajax_select.urls')),
        this URL is expected in the code below, so it won't work under a different path

        this view then hijacks the result that the django admin returns
        and instead of calling django's dismissAddAnontherPopup(win,newId,newRepr)
        it calls didAddPopup(win,newId,newRepr) which was added inline with bootstrap.html
    """
    themodel = models.get_model(app_label, model)
    admin = site._registry[themodel]

    # TODO : should detect where we really are
    admin.admin_site.root_path = "/ajax_select/"

    response = admin.add_view(request, request.path)
    if request.method == 'POST':
        if 'opener.dismissAddAnotherPopup' in response.content:
            return HttpResponse(response.content.replace('dismissAddAnotherPopup', 'didAddPopup'))
    return response


@permission_required('is_superuser')
def ajax_lookup_form(request, model, app_label, channel):
    project_name = os.path.basename(settings.PROJECT_ROOT)
    foreign_model_name = channel.capitalize()
    from django import forms

    pk = request.GET.get('pk', 0)
    counter = request.GET.get('counter', 0)
    ch = models.get_model(app_label, channel)
    foreign_model_instance = ch.objects.get(pk=pk)


    project_forms = __import__('%s.%s.forms' % (project_name, app_label), globals(), locals(), ['a'], -1)
    ForeignForm = getattr(project_forms, '%sAdminForm' % foreign_model_name, None)
    if not ForeignForm:
        ForeignForm = type("ForeignForm", (forms.ModelForm,), {
            'Meta': type('Meta', (object,), {'model': foreign_model_instance})
        })

    foreign_form_instance = ForeignForm(instance=foreign_model_instance, prefix='%s_%s-%s' % (model.capitalize(),
                                                                                              channel,
                                                                                              counter))

    results = foreign_form_instance.as_ul()
    return HttpResponse(results, mimetype='text/html')
