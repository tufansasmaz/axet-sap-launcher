#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAP Documentation Search

Searches SAP documentation including:
- ABAP reference (help.sap.com)
- ABAP Cloud documentation
- CDS views and annotations
- RAP (RESTful Application Programming Model)
- SAP Community Q&A
- Software Heroes tutorials
"""

import re
import sys
from pathlib import Path
from typing import List, Dict, Optional
from urllib.parse import quote, urlencode

# Try to import requests for online search
try:
    import requests
    from urllib3.exceptions import InsecureRequestWarning
    requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


# SAP Documentation URLs
SAP_DOCS_BASE = "https://help.sap.com"
SAP_COMMUNITY_SEARCH = "https://community.sap.com/search"
SOFTWARE_HEROES_API = "https://developers.sap.com/api/developer-news/v2/posts"


def generate_sap_doc_url(topic: str, doc_type: str = "abap") -> str:
    """
    Generate SAP documentation URL for a given topic.

    Args:
        topic: The topic to search for (e.g., "SELECT", "CDS view")
        doc_type: Type of documentation (abap, cds, rap, cloud)

    Returns:
        URL to SAP documentation
    """
    topic_encoded = quote(topic)

    # ABAP Cloud documentation
    if doc_type == "cloud":
        return f"{SAP_DOCS_BASE}/doc/abap-cloud"

    # CDS documentation
    if doc_type == "cds":
        return f"{SAP_DOCS_BASE}/doc/abap-cds"

    # RAP documentation
    if doc_type == "rap":
        return f"{SAP_DOCS_BASE}/doc/abap-rap"

    # Default ABAP documentation
    if doc_type == "abap":
        return f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/index.htm?query={topic_encoded}"

    return f"{SAP_DOCS_BASE}/"


def search_sap_annotations(query: str) -> List[Dict[str, str]]:
    """
    Search for CDS/ABAP annotations matching a query.

    Args:
        query: Search query (can include @Annotation patterns)

    Returns:
        List of matching annotations with documentation URLs
    """
    # Common ABAP Cloud annotations with their descriptions
    annotations = {
        # CDS Annotations
        "@EndUserText.label": "CDS - Define end user label for field",
        "@EndUserText.text": "CDS - Define end user text (description)",
        "@ObjectModel.textElement": "CDS - Mark field as text element for OData",
        "@ObjectModel.readOnly": "CDS - Mark field as read-only in OData",
        "@DataModel.readOnly": "CDS - Mark field as read-only (UI.hidden in RAP)",
        "@UI.hidden": "CDS/UI - Hide field from UI",
        "@UI.identification": "CDS/UI - Mark field as identification (key visual)",
        "@UI.lineItem": "CDS/UI - Show field in list/table",
        "@UI.selectionField": "CDS/UI - Show field as selection criteria",
        "@Consumption": "CDS - Define consumption (view, service, etc.)",
        "@AccessControl.authorizationCheck": "CDS - Define access control",
        "@Metadata.allowExtensions": "CDS - Allow metadata extensions",

        # RAP Annotations
        "@OData.publish": "RAP - Publish CDS view as OData service",
        "@OData.format": "RAP - Format options (JSON, XML)",
        "@OData.service": "RAP - Define OData service name",
        "@ObjectModel.entityType": "RAP - Define entity type in BDEF",
        "@ObjectModel.association": "RAP - Define association in BDEF",
        "@ObjectModel.compositionRoot": "RAP - Mark as composition root",
        "@ObjectModel.supportedCapabilities": "RAP - Define supported operations",

        # Behavior Definitions
        "@Semantics.userDefault": "BDEF - Default value for property",
        "@Semantics.user.filled": "BDEF - User must fill value",
        "@Semantics.user.readOnly": "BDEF - User read-only property",
        "@Semantics.alternativeKey": "BDEF - Alternative key for uniqueness",

        # Table Types
        "@SEMANTICS.quantity": "DDIC - Field is a quantity",
        "@SEMANTICS.amount": "DDIC - Field is an amount",
        "@SEMANTICS.price": "DDIC - Field is a price",
        "@SEMANTICS.unit": "DDIC - Field is a unit of measure",
    }

    query_lower = query.lower()

    # Filter annotations matching the query
    results = []
    for annotation, description in annotations.items():
        if query_lower in annotation.lower() or query_lower in description.lower():
            # Generate documentation URL
            if annotation.startswith("@") and "." in annotation:
                category = annotation.split(".")[0].replace("@", "").upper()
                url = f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/index.htm?search={quote(annotation)}"
            else:
                url = f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/index.htm?search={quote(annotation)}"

            results.append({
                "annotation": annotation,
                "description": description,
                "url": url
            })

    return results


def search_abap_syntax(keyword: str) -> List[Dict[str, str]]:
    """
    Search for ABAP syntax documentation.

    Args:
        keyword: ABAP keyword or statement

    Returns:
        List of syntax references
    """
    # Common ABAP keywords with documentation links
    syntax_patterns = {
        "SELECT": {
            "syntax": "SELECT SINGLE ... FROM ... INTO ... WHERE ... ORDER BY ...",
            "url": f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/abapselect.htm",
            "description": "ABAP SQL SELECT statement syntax"
        },
        "DATA": {
            "syntax": "DATA: TYPE ... VALUE ... READ-ONLY ...",
            "url": f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/abapdata.htm",
            "description": "DATA statement for declaring variables"
        },
        "CLASS": {
            "syntax": "CLASS ... DEFINITION ... CREATE ... FRIENDS ...",
            "url": f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/abapclass.htm",
            "description": "ABAP Objects - class definition"
        },
        "METHOD": {
            "syntax": "METHODS ... [ABSTRACT] ... [IMPORTING ...] ... [RETURNING ...] ... [RAISING ...]",
            "url": f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/abapmethods.htm",
            "description": "Method declaration in ABAP Objects"
        },
        "LOOP": {
            "syntax": "LOOP AT ... INTO ... WHERE ...",
            "url": f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/abaploop.htm",
            "description": "Loop over internal tables"
        },
        "MODIFY": {
            "syntax": "MODIFY ... FROM ... [INDEX ...] [TRANSPORTING ...]",
            "url": f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/abapmodify_table.htm",
            "description": "MODIFY statement for table updates"
        },
        "EML": {
            "syntax": "MODIFY ENTITIES ... FROM ... [ENTITY ...] [FAILED ...] [MAPPED ...] [REPORTING ...]",
            "url": f"{SAP_DOCS_BASE}/doc/abap-rap/en-US/index.htm?search=eml",
            "description": "EML (Entity Manipulation Language) for RAP"
        },
    }

    keyword_upper = keyword.upper()

    results = []
    for key, info in syntax_patterns.items():
        if keyword_upper in key or key.startswith(keyword_upper):
            results.append({
                "keyword": key,
                "syntax": info["syntax"],
                "url": info["url"],
                "description": info["description"]
            })

    return results


def get_abap_cloud_guide(topic: str) -> List[Dict[str, str]]:
    """
    Get ABAP Cloud development guides for a topic.

    Args:
        topic: The development topic

    Returns:
        List of relevant guides
    """
    guides = {
        "rap": [
            {
                "title": "RAP Development Guide",
                "url": f"{SAP_DOCS_BASE}/doc/abap-rap/en-US",
                "description": "Complete RAP (RESTful Application Programming Model) guide"
            },
            {
                "title": "Behavior Definitions (BDEF)",
                "url": f"{SAP_DOCS_BASE}/doc/abap-rap/en-US/rap_behavior_definition.htm",
                "description": "How to create behavior definitions for RAP business objects"
            },
            {
                "title": "Behavior Implementations (BIMP)",
                "url": f"{SAP_DOCS_BASE}/doc/abap-rap/en-US/rap_behavior_implementation.htm",
                "description": "How to implement behavior for RAP business objects"
            },
        ],
        "cds": [
            {
                "title": "CDS View Development Guide",
                "url": f"{SAP_DOCS_BASE}/doc/abap-cds/en-US",
                "description": "Core Data Services (CDS) complete guide"
            },
            {
                "title": "CDS Annotations Reference",
                "url": f"{SAP_DOCS_BASE}/abap-docs/latest/en-US/index.htm?search=cds+annotations",
                "description": "All CDS annotations reference"
            },
        ],
        "clean": [
            {
                "title": "Clean Core Development Guide",
                "url": f"{SAP_DOCS_BASE}/doc/abap-cloud/en-US",
                "description": "ABAP Cloud Clean Core principles and guidelines"
            },
            {
                "title": "ABAP Cloud Programming Model",
                "url": f"{SAP_DOCS_BASE}/doc/abap-cloud/en-US/abap-cloud-programming-model.htm",
                "description": "ABAP Cloud vs standard ABAP differences"
            },
        ],
    }

    topic_lower = topic.lower()

    # Check which guide category matches
    for category, guide_list in guides.items():
        if category in topic_lower or any(keyword in topic_lower for keyword in ["rap", "bdef", "bimp"]):
            if category == "rap" and ("rap" in topic_lower or "bdef" in topic_lower or "bimp" in topic_lower):
                return guide_list
            if category == "cds" and "cds" in topic_lower:
                return guide_list
            if category == "clean" and ("clean" in topic_lower or "cloud" in topic_lower):
                return guide_list

    # Default: return overview
    return [
        {
            "title": "SAP Help Portal",
            "url": f"{SAP_DOCS_BASE}/",
            "description": "SAP documentation home page"
        }
    ]


def search_software_heroes(query: str, limit: int = 5) -> List[Dict[str, str]]:
    """
    Search Software Heroes blog for ABAP tutorials.

    Args:
        query: Search query
        limit: Maximum results to return

    Returns:
        List of matching articles
    """
    if not HAS_REQUESTS:
        return [{
            "title": "Requests library not available",
            "url": "https://blogs.sap.com/tags/abap/",
            "description": "Install requests library to enable online search"
        }]

    # Software Heroes has an API we can query
    try:
        params = {
            "search": query,
            "tags": "abap",
            "limit": limit
        }
        url = f"{SOFTWARE_HEROES_API}/search"

        response = requests.get(url, params=params, timeout=10, verify=False)

        if response.status_code == 200:
            data = response.json()
            results = []
            for post in data.get("posts", [])[:limit]:
                results.append({
                    "title": post.get("title", ""),
                    "url": post.get("url", ""),
                    "description": post.get("excerpt", "")[:200],
                    "author": post.get("author", {}).get("name", ""),
                    "date": post.get("date", "")
                })
            return results
    except Exception as e:
        pass  # Fall through to manual URL

    # Fallback: return manual search URL
    return [{
        "title": f"Search Software Heroes for '{query}'",
        "url": f"https://developers.sap.com/search?search={quote(query)}&tags=abap",
        "description": "Manual search link - opens Software Heroes with pre-filled search"
    }]


def search_sap_community(query: str, limit: int = 5) -> List[Dict[str, str]]:
    """
    Generate SAP Community search URL.

    Args:
        query: Search query
        limit: Maximum results

    Returns:
        Search URL and instructions
    """
    params = urlencode({
        "searchText": query,
        "pageSize": str(limit),
        "sort": "relevance"
    })

    return [{
        "title": f"SAP Community Search for '{query}'",
        "url": f"{SAP_COMMUNITY_SEARCH}?{params}",
        "description": "Search SAP Community Q&A, blogs, and discussions"
    }]


def main():
    """Main entry point for command-line usage."""
    if len(sys.argv) < 2:
        print("SAP Documentation Search")
        print("=" * 50)
        print()
        print("Usage:")
        print("  python sap_docs_search.py <query>")
        print()
        print("Examples:")
        print("  python sap_docs_search.py '@OData.publish'")
        print("  python sap_docs_search.py 'SELECT statement'")
        print("  python sap_docs_search.py 'RAP business object'")
        print()
        return

    query = " ".join(sys.argv[1:])

    print(f"Searching SAP Documentation for: {query}")
    print("=" * 50)

    # Check for annotation pattern
    if "@" in query:
        print("\n[Annotation Search]")
        results = search_sap_annotations(query)
        for r in results[:10]:
            print(f"  {r['annotation']}")
            print(f"    {r['description']}")
            print(f"    {r['url']}")
            print()

    # Check for ABAP syntax
    syntax_results = search_abap_syntax(query)
    if syntax_results:
        print("\n[Syntax Reference]")
        for r in syntax_results:
            print(f"  {r['keyword']}")
            print(f"    {r['syntax']}")
            print(f"    {r['url']}")
            print()

    # Check for ABAP Cloud guides
    guides = get_abap_cloud_guide(query)
    if guides and guides[0]["title"] != "SAP Help Portal":
        print("\n[ABAP Cloud Guides]")
        for g in guides[:5]:
            print(f"  {g['title']}")
            print(f"    {g['description']}")
            print(f"    {g['url']}")
            print()

    # Software Heroes search
    sh_results = search_software_heroes(query)
    if sh_results:
        print("\n[Software Heroes Tutorials]")
        for r in sh_results[:5]:
            print(f"  {r['title']}")
            print(f"    {r['url']}")
            if r.get("description"):
                print(f"    {r['description'][:100]}...")
            print()

    # SAP Community search
    print("\n[SAP Community]")
    comm_results = search_sap_community(query)
    for r in comm_results:
        print(f"  {r['title']}")
        print(f"    {r['url']}")
        print()


if __name__ == "__main__":
    main()
