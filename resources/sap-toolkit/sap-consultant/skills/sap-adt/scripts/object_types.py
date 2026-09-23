#!/usr/bin/env python3
"""
SAP ABAP Object Types Helper
Centralized mapping of object types to URLs and metadata
"""

import sys

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there, including text this file never sees
# in its own source -- an object name or a path arrives through a variable. The
# work is done by then, so the consultant reads a traceback for something that
# actually succeeded. See scripts/test_skill_scripts.py for the three times this
# was found and locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# Object type mappings
OBJECT_TYPES = {
    'class': {
        'adt_type': 'CLAS/OC',
        'url_path': 'oo/classes',
        'xml_namespace': 'class',
        'description': 'ABAP Class',
        'supports_create': True,
        'file_extension': '.clas.abap'
    },
    'interface': {
        'adt_type': 'INTF/OI',
        'url_path': 'oo/interfaces',
        'xml_namespace': 'interface',
        'description': 'ABAP Interface',
        'supports_create': True,
        'file_extension': '.intf.abap'
    },
    'program': {
        'adt_type': 'PROG/P',
        'url_path': 'programs/programs',
        'xml_namespace': 'program',
        'description': 'ABAP Program (Report)',
        'supports_create': True,
        'file_extension': '.prog.abap'
    },
    'include': {
        'adt_type': 'PROG/I',
        'url_path': 'programs/includes',
        'xml_namespace': 'include',
        'description': 'ABAP Include',
        'supports_create': True,
        'file_extension': '.prog.abap'
    },
    'functiongroup': {
        'adt_type': 'FUGR/F',
        'url_path': 'functions/groups',
        'xml_namespace': 'functiongroup',
        'description': 'Function Group',
        'supports_create': True,
        'file_extension': '.fugr.abap'
    },
    'function': {
        'adt_type': 'FUNC/FF',
        # A function module has NO standalone URI. It is addressed only under its
        # group. This value is a template, not a path -- get_object_url() fills it
        # and refuses when no group is given, so the group-less form (which 404s on
        # every system) cannot be built by accident. It used to read
        # 'functions/modules', and that was the 404 consultants kept hitting.
        'url_path': 'functions/groups/{function_group}/fmodules',
        'xml_namespace': 'function',
        'description': 'Function Module',
        'supports_create': False,  # Use create_function_module() instead (requires function group)
        'file_extension': '.func.abap'
    },
    # DDIC types
    'dataelement': {
        'adt_type': 'DTEL/DE',
        'url_path': 'ddic/dataelements',
        'xml_namespace': 'dataelement',
        'description': 'Data Element',
        'supports_create': True,
        'file_extension': '.dtel.xml'
    },
    'domain': {
        'adt_type': 'DOMA/DD',
        'url_path': 'ddic/domains',
        'xml_namespace': 'domain',
        'description': 'Domain',
        'supports_create': True,
        'file_extension': '.doma.xml'
    },
    'table': {
        'adt_type': 'TABL/DT',
        'url_path': 'ddic/tables',
        'xml_namespace': 'table',
        'description': 'Database Table',
        'supports_create': True,
        'file_extension': '.tabl.xml'
    },
    'structure': {
        'adt_type': 'TABL/DS',
        'url_path': 'ddic/structures',
        'xml_namespace': 'structure',
        'description': 'Structure',
        'supports_create': True,
        'file_extension': '.tabl.xml'
    },
    # Creatable since the 2026-08-19 repair, so readable and deletable too. Leaving
    # them out is how the engine ended up able to CREATE a type group it could then
    # neither read back nor delete.
    # adt_clear_lock resolves its URL through this map, so a type missing here is a
    # type the engine can lock but not unlock. Message classes were exactly that:
    # create registers the user as editing, and the recovery tool answered
    # "Unsupported object type: messageclass".
    'messageclass': {
        'adt_type': 'MSAG/N',
        'url_path': 'messageclass',
        'xml_namespace': 'messageclass',
        'description': 'Message Class',
        'supports_create': True,
        'file_extension': '.msag.xml'
    },
    'typegroup': {
        'adt_type': 'TYPE/DT',
        'url_path': 'ddic/typegroups',
        'xml_namespace': 'typegroup',
        'description': 'Type Group',
        'supports_create': True,
        'file_extension': '.type.abap'
    },
    'lockobject': {
        'adt_type': 'ENQU/DL',
        'url_path': 'ddic/lockobjects/sources',
        'xml_namespace': 'lockobject',
        'description': 'Lock Object',
        'supports_create': True,
        'file_extension': '.enqu.xml'
    },
    'tabletype': {
        'adt_type': 'TTYP/DA',
        'url_path': 'ddic/tabletypes',
        'xml_namespace': 'tabletype',
        'description': 'Table Type',
        'supports_create': True,
        'file_extension': '.ttyp.xml'
    },
    'cds': {
        'adt_type': 'DDLS/DF',
        'url_path': 'ddic/ddl/sources',
        'xml_namespace': 'ddl',
        'description': 'CDS View (DDL Source)',
        'supports_create': True,
        'file_extension': '.ddls.asddls'
    },
    'metadataextension': {
        'adt_type': 'DDLX/EX',
        'url_path': 'ddic/ddlx/sources',
        'xml_namespace': 'ddlx',
        'description': 'CDS Metadata Extension (DDLX)',
        'supports_create': True,
        'file_extension': '.ddlx.asddlxs'
    },
    'accesscontrol': {
        'adt_type': 'DCLS/DL',
        'url_path': 'acm/dcl/sources',
        'xml_namespace': 'dcl',
        'description': 'CDS Access Control (DCL)',
        'supports_create': True,
        'file_extension': '.dcls.asdcls'
    },
    # RAP service stack. Added 2026-08-11 so source-bearing RAP objects can be READ
    # and PUSHED like any other source object -- endpoints and adt types read off a
    # live S/4 system, not guessed.
    #
    # supports_create is False on both, deliberately: the generic create path does
    # not know these, and there are two better ways in. Reproducing an existing
    # object (cross-system transfer) goes through create_ddic_shell + push, which
    # carries the real definition as text. Building a NEW behaviour definition from
    # a specification goes through create_behavior_definition(), which knows about
    # root entities and implementation types.
    'behaviordefinition': {
        'adt_type': 'BDEF/BDO',
        'url_path': 'bo/behaviordefinitions',
        'xml_namespace': 'blue',
        'description': 'Behavior Definition',
        'supports_create': False,
        'file_extension': '.bdef.abap'
    },
    'servicedefinition': {
        'adt_type': 'SRVD/SRV',
        'url_path': 'ddic/srvd/sources',
        'xml_namespace': 'srvd',
        'description': 'Service Definition',
        'supports_create': False,
        'file_extension': '.srvd.srvdsrv'
    },
    # Listed so a binding can be ACTIVATED. It is not source-bearing and is not
    # created generically (see create_service_binding), but activation is not
    # optional: an inactive binding is invisible to the publish job, which answers
    # "Service Binding ... does not exist" for an object sitting right there.
    # Measured on NS4 2026-08-11.
    'servicebinding': {
        'adt_type': 'SRVB/SVB',
        'url_path': 'businessservices/bindings',
        'xml_namespace': 'srvb',
        'description': 'Service Binding',
        'supports_create': False,
        'file_extension': '.srvb.xml'
    },
    'package': {
        'adt_type': 'DEVC/K',
        'url_path': 'packages',
        'xml_namespace': 'package',
        'description': 'ABAP Package',
        'supports_create': True,
        'file_extension': ''
    }
}

# Aliases for convenience
OBJECT_TYPE_ALIASES = {
    'clas': 'class',
    'intf': 'interface',
    'prog': 'program',
    'fugr': 'functiongroup',
    'func': 'function',
    'incl': 'include',
    'report': 'program',
    # DDIC aliases
    'dtel': 'dataelement',
    'doma': 'domain',
    'tabl': 'table',
    'ttyp': 'tabletype',
    # CDS aliases
    'ddls': 'cds',
    'ddl': 'cds',
    'cdsview': 'cds',
    'ddlx': 'metadataextension',
    'mde': 'metadataextension',
    'dcls': 'accesscontrol',
    'dcl': 'accesscontrol',
    # Package alias
    'devc': 'package'
}


def normalize_object_type(object_type):
    """Normalize object type string to canonical form"""
    if not object_type:
        return 'class'  # Default

    obj_type = object_type.lower().strip()

    # Check aliases first
    if obj_type in OBJECT_TYPE_ALIASES:
        return OBJECT_TYPE_ALIASES[obj_type]

    # Check direct match
    if obj_type in OBJECT_TYPES:
        return obj_type

    # An ADT type code, which is what our OWN adt_search hands back. A consultant
    # copying "CLAS/OC" out of a search result into adt_push met "Unsupported
    # object type: CLAS/OC. Supported: class, interface, ..." -- three tools in
    # one kit disagreeing about how to spell the same field. The mapping is right
    # here in this table, so read it rather than making the caller translate.
    upper = object_type.strip().upper()
    for key, spec in OBJECT_TYPES.items():
        if spec.get('adt_type', '').upper() == upper:
            return key
    # Bare group ("CLAS", "PROG"): unambiguous only when one entry claims it.
    if '/' not in upper:
        hits = [k for k, s in OBJECT_TYPES.items()
                if s.get('adt_type', '').upper().split('/')[0] == upper]
        if len(hits) == 1:
            return hits[0]

    raise ValueError(f"Unsupported object type: {object_type}. Supported: {', '.join(OBJECT_TYPES.keys())}")


def get_object_url(object_name, object_type='class', function_group=None):
    """Generate SAP ADT object URL for any object type.

    `function_group` is REQUIRED for object_type='function' and ignored otherwise.
    A function module has no URI of its own -- ADT addresses it only under its
    group. Building the group-less form gives a 404 that reads like "the object
    does not exist", which is why this raises instead of guessing.
    """
    obj_type = normalize_object_type(object_type)
    type_info = OBJECT_TYPES[obj_type]
    name_lower = object_name.lower()

    if obj_type == 'function':
        if not function_group:
            raise ValueError(
                f"Function module '{object_name}' cannot be addressed on its own -- "
                f"ADT has no URI for a bare FM, and the group-less form returns 404. "
                f"Pass function_group=<group>.\n"
                f"  To find the group:  adt_sql(\"SELECT pname FROM tfdir WHERE "
                f"funcname = '{object_name.upper()}'\")  -- the group is PNAME "
                f"without its leading 'SAPL'.\n"
                f"  To write an FM:     adt_write_function_module(name=..., "
                f"function_group=..., source_file=...). adt_push cannot write one.")
        path = type_info['url_path'].replace('{function_group}',
                                             str(function_group).lower())
        return f'/sap/bc/adt/{path}/{name_lower}'

    return f'/sap/bc/adt/{type_info["url_path"]}/{name_lower}'


def get_source_url(object_name, object_type='class', function_group=None):
    """Generate source URL with /source/main suffix"""
    base_url = get_object_url(object_name, object_type, function_group)
    return f'{base_url}/source/main'


def get_adt_type(object_type):
    """Get ADT type identifier (e.g., CLAS/OC)"""
    obj_type = normalize_object_type(object_type)
    return OBJECT_TYPES[obj_type]['adt_type']


def get_file_extension(object_type):
    """Get recommended file extension"""
    obj_type = normalize_object_type(object_type)
    return OBJECT_TYPES[obj_type]['file_extension']


def supports_creation(object_type):
    """Check if object type can be created via API"""
    obj_type = normalize_object_type(object_type)
    return OBJECT_TYPES[obj_type]['supports_create']


def list_supported_types():
    """List all supported object types"""
    return list(OBJECT_TYPES.keys())


def get_type_description(object_type):
    """Get human-readable description of object type"""
    obj_type = normalize_object_type(object_type)
    return OBJECT_TYPES[obj_type]['description']


def get_adt_type_from_url(object_url):
    """Reverse-lookup ADT type from an object URL path.

    This is the single source of truth for URL-to-type mapping, used by
    activation and syntax-check XML builders.

    Args:
        object_url: URL path like '/sap/bc/adt/oo/classes/zcl_test'

    Returns:
        ADT type string (e.g., 'CLAS/OC') or 'UNKNOWN' if not matched
    """
    # A function-module URL is nested inside its group's, so it also contains
    # '/functions/groups/' and the loop below would answer FUGR/F. Check the
    # inner segment first.
    if '/fmodules/' in object_url:
        return 'FUNC/FF'

    # Build reverse map from url_path -> adt_type
    for obj_type_info in OBJECT_TYPES.values():
        url_segment = obj_type_info['url_path']
        if '{' in url_segment:          # a template, not a path -- handled above
            continue
        if f'/{url_segment}/' in object_url:
            return obj_type_info['adt_type']
    return 'UNKNOWN'


# Map of type -> local subdirectory for workspace file storage
_TYPE_TO_SUBDIR = {
    'class': 'classes', 'clas': 'classes',
    'interface': 'classes', 'intf': 'classes',
    'program': 'progs', 'prog': 'progs', 'report': 'progs',
    'include': 'progs', 'incl': 'progs',
    'functiongroup': 'fugr', 'fugr': 'fugr',
    'function': 'fugr', 'func': 'fugr',
    'dataelement': 'ddic', 'dtel': 'ddic',
    'domain': 'ddic', 'doma': 'ddic',
    'table': 'ddic', 'tabl': 'ddic',
    'structure': 'ddic',
    'tabletype': 'ddic', 'ttyp': 'ddic',
    'cds': 'cds', 'ddls': 'cds', 'ddl': 'cds', 'cdsview': 'cds',
    'metadataextension': 'cds', 'ddlx': 'cds', 'mde': 'cds',
    'accesscontrol': 'cds', 'dcls': 'cds', 'dcl': 'cds',
    'package': 'packages', 'devc': 'packages',
}


def get_local_subdir(object_type):
    """Get local subdirectory name for storing files of this object type.

    Args:
        object_type: Object type string (canonical or alias)

    Returns:
        Subdirectory name like 'classes', 'progs', 'fugr', 'ddic'
    """
    return _TYPE_TO_SUBDIR.get(object_type.lower(), 'classes')


def format_object_name(name, object_type='class'):
    """Format object name with type prefix for display"""
    obj_type = normalize_object_type(object_type)
    desc = OBJECT_TYPES[obj_type]['description']
    return f"{desc}: {name}"


if __name__ == '__main__':
    # Test/demo
    print("Supported SAP Object Types:")
    print("=" * 70)
    for obj_type in OBJECT_TYPES:
        info = OBJECT_TYPES[obj_type]
        print(f"\n{obj_type.upper()}")
        print(f"  Description: {info['description']}")
        print(f"  ADT Type:    {info['adt_type']}")
        print(f"  URL Path:    {info['url_path']}")
        print(f"  Extension:   {info['file_extension']}")
        print(f"  Can Create:  {info['supports_create']}")

    print("\n" + "=" * 70)
    print("\nAliases:")
    for alias, target in OBJECT_TYPE_ALIASES.items():
        print(f"  {alias} -> {target}")
