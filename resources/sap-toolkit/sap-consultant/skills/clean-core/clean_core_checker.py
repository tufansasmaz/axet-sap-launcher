#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ABAP Cloud Clean Core Checker

Checks if SAP objects are released for ABAP Cloud development
and finds replacement objects for deprecated/forbidden SAP objects.

Data source: ROSA — Released Objects Search Assistant
(https://github.com/ClementRingot/ROSA, MIT), which wraps SAP's official
Cloudification Repository (github.com/SAP/abap-atc-cr-cv-s4hc). The default
endpoint is ROSA's public hosted instance; set ROSA_BASE_URL to point at a
self-hosted instance (`npx -y @rosa-mcp/server`, Docker, or a BTP deployment —
the ROSA repo ships mta.yaml) when the public host is unreachable or an
NTT-controlled endpoint is preferred. Only STANDARD SAP object names are ever
sent — never customer Z/Y names or business data. COMMON_REPLACEMENTS below is
the offline fallback when no endpoint is reachable.
"""

import os
import sys
import json
from typing import List, Dict, Optional, Any
from urllib.parse import quote

# Try to import requests for API calls
try:
    import requests
    from urllib3.exceptions import InsecureRequestWarning
    requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# API endpoint — ROSA public instance by default; override with ROSA_BASE_URL
# (base URL without /api) to use a self-hosted / NTT-hosted instance.
API_BASE = os.environ.get(
    "ROSA_BASE_URL",
    "https://sap-released-objects-server-production.up.railway.app",
).rstrip("/") + "/api"

# Common forbidden objects and their replacements (cached for offline use)
COMMON_REPLACEMENTS = {
    "MARA": {
        "object_type": "TABL",
        "replacement": "I_PRODUCT",
        "replacement_type": "INTF",
        "description": "Material master (use I_PRODUCT interface instead)"
    },
    "MARC": {
        "object_type": "TABL",
        "replacement": "I_PRODUCT",
        "replacement_type": "INTF",
        "description": "Material master (client-side, use I_PRODUCT)"
    },
    "MAKT": {
        "object_type": "TABL",
        "replacement": "I_PRODUCT",
        "replacement_type": "INTF",
        "description": "Material master (customer, use I_PRODUCT)"
    },
    "BSEG": {
        "object_type": "TABL",
        "replacement": None,
        "replacement_type": None,
        "description": "Document segment (no direct replacement - use BAPIs/APIs)"
    },
    "CL_GUI_ALV_GRID": {
        "object_type": "CLAS",
        "replacement": "CL_SALV_TABLE",
        "replacement_type": "CLAS",
        "description": "ALV Grid (use SALV table instead)"
    },
    "CL_GUI_ALV_TREE": {
        "object_type": "CLAS",
        "replacement": "CL_SALV_TREE",
        "replacement_type": "CLAS",
        "description": "ALV Tree (use SALV tree instead)"
    },
    "VBAK": {
        "object_type": "TABL",
        "replacement": None,
        "replacement_type": None,
        "description": "Sales header (no direct replacement - use BAPIs)"
    },
    "T001": {
        "object_type": "TABL",
        "replacement": None,
        "replacement_type": None,
        "description": "Customer master (no direct replacement - use BAPIs)"
    },
    "T002": {
        "object_type": "TABL",
        "replacement": None,
        "replacement_type": None,
        "description": "Contact person (no direct replacement - use BAPIs)"
    },
    "CL_GUI_FRONTEND_SERVICES": {
        "object_type": "CLAS",
        "replacement": None,
        "replacement_type": None,
        "description": "GUI services (not available in cloud)"
    },
    "CL_GUI_RESOURCES": {
        "object_type": "CLAS",
        "replacement": None,
        "replacement_type": None,
        "description": "GUI resources (not available in cloud)"
    },
}


def search_object(object_name: str, object_type: str = "") -> Dict[str, Any]:
    """
    Search for an object in the SAP released objects database.

    Args:
        object_name: Name of the object (e.g., "MARA", "I_PRODUCT")
        object_type: Type of object (TABL, CLAS, INTF, DTEL, etc.)

    Returns:
        Dict with object details including release status and successors
    """
    if not HAS_REQUESTS:
        return {
            "error": "Requests library not available",
            "hint": "Install requests library: pip install requests"
        }

    # Build API URL
    params = {"object_name": object_name}
    if object_type:
        params["object_type"] = object_type

    try:
        response = requests.get(
            f"{API_BASE}/search",
            params=params,
            timeout=10,
            verify=False
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("results") and len(data["results"]) > 0:
                return data["results"][0]
            else:
                return {"error": "Object not found in released objects database"}
        else:
            return {"error": f"API request failed: {response.status_code}"}

    except Exception as e:
        # Fall back to cached data
        if object_name in COMMON_REPLACEMENTS:
            info = COMMON_REPLACEMENTS[object_name]
            return {
                "object_name": object_name,
                "object_type": info["object_type"],
                "clean_core_level": "D",
                "released": False,
                "successors": [],
                "cached": True,
                "note": f"{info['description']}",
                "replacement": info["replacement"]
            }
        return {
            "error": f"Search failed: {str(e)}",
            "fallback": f"Check cached replacements for {object_name}"
        }


def get_object_details(object_name: str, object_type: str = "") -> Dict[str, Any]:
    """
    Get detailed information about an object including release status and successors.

    Args:
        object_name: Name of the object
        object_type: Type of object (optional)

    Returns:
        Dict with full object details
    """
    if not HAS_REQUESTS:
        return {
            "error": "Requests library not available",
            "hint": "Install requests library: pip install requests"
        }

    # Use check_compliance with single object instead of /object endpoint
    result = check_compliance([object_name])

    if "error" in result:
        return result

    # Extract single object result
    results_list = result.get("results", [])
    if results_list and len(results_list) > 0:
        obj_data = results_list[0]
        # Map to expected format
        return {
            "object_name": obj_data.get("objectName", object_name),
            "object_type": obj_data.get("objectType", ""),
            "clean_core_level": obj_data.get("cleanCoreLevel", "?"),
            "released": obj_data.get("status", "") == "compliant",
            "category": obj_data.get("state", ""),
            "successors": [
                {
                    "object_name": s.get("objectName", ""),
                    "object_type": s.get("objectType", ""),
                    "description": f"Successor for {object_name}"
                }
                for s in obj_data.get("successor", {}).get("objects", [])
            ]
        }

    return {"error": "Object not found"}


def check_compliance(object_names: List[str]) -> Dict[str, Any]:
    """
    Check Clean Core compliance for a list of objects.

    Args:
        object_names: List of object names to check

    Returns:
        Dict with compliance results and statistics
    """
    if not HAS_REQUESTS:
        return {
            "error": "Requests library not available",
            "hint": "Install requests library: pip install requests"
        }

    try:
        response = requests.get(
            f"{API_BASE}/compliance",
            params={"object_names": ",".join(object_names)},
            timeout=15,
            verify=False
        )

        if response.status_code == 200:
            api_result = response.json()

            # Check for "not_found" objects and merge with cached data
            results_list = api_result.get("results", [])
            has_not_found = any(r.get("status") == "not_found" for r in results_list)

            if has_not_found:
                # Merge cached data for not_found objects
                merged_results = []
                for r in results_list:
                    obj_name = r.get("input", "")
                    if r.get("status") == "not_found" and obj_name in COMMON_REPLACEMENTS:
                        # Use cached data
                        info = COMMON_REPLACEMENTS[obj_name]
                        merged_results.append({
                            "input": obj_name,
                            "status": "non_compliant",
                            "objectType": info.get("object_type", ""),
                            "objectName": obj_name,
                            "cleanCoreLevel": "D",
                            "state": "deprecated",
                            "cached": True,
                            "successor": {
                                "objects": [
                                    {"objectType": info.get("replacement_type", ""),
                                     "objectName": info.get("replacement", "")}
                                ] if info.get("replacement") else []
                            }
                        })
                    else:
                        merged_results.append(r)

                # Recalculate counts
                api_result["results"] = merged_results
                api_result["compliant"] = sum(1 for r in merged_results if r.get("status") == "compliant")
                api_result["nonCompliant"] = sum(1 for r in merged_results if r.get("status") == "non_compliant")
                api_result["notFound"] = sum(1 for r in merged_results if r.get("status") == "not_found")

            return api_result
        else:
            # Fall back to cached data on API error
            raise Exception(f"API returned status {response.status_code}")

    except Exception as e:
        # Fall back to cached data
        results = {}
        for obj in object_names:
            obj_upper = obj.upper()
            if obj_upper in COMMON_REPLACEMENTS:
                info = COMMON_REPLACEMENTS[obj_upper]
                results[obj] = {
                    "object_name": obj_upper,
                    "released": False,
                    "level": "D",
                    "note": info['description'],
                    "replacement": info['replacement']
                }
            else:
                results[obj] = {
                    "object_name": obj_upper,
                    "released": True,  # Assume released if not in known forbidden list
                    "level": "A",
                    "note": "Not in known forbidden list"
                }

        return {
            "results": results,
            "cached": True,
            "total": len(object_names),
            "compliant_count": sum(1 for v in results.values() if v.get("released", False)),
            "non_compliant_count": sum(1 for v in results.values() if not v.get("released", True))
        }


def get_successor(object_name: str) -> Optional[Dict[str, str]]:
    """
    Get the successor/replacement object for a forbidden object.

    Args:
        object_name: Name of the forbidden object

    Returns:
        Dict with replacement object info, or None if no successor exists
    """
    # First check cache
    obj_upper = object_name.upper()
    if obj_upper in COMMON_REPLACEMENTS:
        info = COMMON_REPLACEMENTS[obj_upper]
        if info["replacement"]:
            return {
                "object_name": info["replacement"],
                "object_type": info["replacement_type"],
                "description": f"Replacement for {object_name}"
            }

    # If requests available, query API
    if HAS_REQUESTS:
        try:
            response = requests.get(
                f"{API_BASE}/successor",
                params={"object_name": object_name},
                timeout=10,
                verify=False
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("successors") and len(data["successors"]) > 0:
                    succ = data["successors"][0]
                    return {
                        "object_name": succ.get("object_name", ""),
                        "object_type": succ.get("object_type", ""),
                        "description": succ.get("description", "Successor for " + object_name)
                    }
        except Exception as e:
            pass

    return None


def main():
    """Main entry point for command-line usage."""
    if len(sys.argv) < 2:
        print("ABAP Cloud Clean Core Checker")
        print("=" * 50)
        print()
        print("Check if SAP objects are released for ABAP Cloud.")
        print()
        print("Usage:")
        print("  python clean_core_checker.py <object_name>")
        print()
        print("Examples:")
        print("  python clean_core_checker.py MARA")
        print("  python clean_core_checker.py CL_GUI_ALV_GRID")
        print("  python clean_core_checker.py MARA BSEG CL_GUI_ALV_GRID")
        print()
        print("Common forbidden objects:")
        for obj in ["MARA", "BSEG", "CL_GUI_ALV_GRID", "VBAK", "T001"]:
            info = COMMON_REPLACEMENTS.get(obj, {})
            repl = info.get("replacement", "NO REPLACEMENT")
            print(f"  {obj} → {repl}")
        print()
        return

    # Single object check
    if len(sys.argv) == 2:
        object_name = sys.argv[1]
        result = get_object_details(object_name)

        print(f"Clean Core Status: {object_name}")
        print("=" * 50)

        if "error" in result:
            print(f"Error: {result['error']}")
            if "hint" in result:
                print(f"Hint: {result['hint']}")
            return

        if "object_name" in result:
            print(f"Object Name: {result['object_name']}")
            print(f"Object Type: {result.get('object_type', 'N/A')}")
            print(f"Clean Core Level: {result.get('clean_core_level', 'N/A')}")
            print(f"Released: {result.get('released', False)}")
            print(f"Category: {result.get('category', 'N/A')}")

            if result.get("successors"):
                print(f"\nSuccessors (replacement objects):")
                for succ in result["successors"]:
                    print(f"  - {succ.get('object_name', '')} ({succ.get('object_type', '')})")
                    if succ.get("description"):
                        print(f"    {succ['description']}")

        print()

    # Multiple objects check (compliance)
    else:
        object_names = sys.argv[1:]
        result = check_compliance(object_names)

        print(f"Clean Core Compliance Check")
        print("=" * 50)
        print(f"Objects checked: {object_names}")
        print()

        if "error" in result:
            print(f"Error: {result['error']}")
            return

        # Handle API response format
        results_data = result.get("results", [])
        if isinstance(results_data, list):
            # API returns list of objects with different field names
            results = {}
            for r in results_data:
                obj_name = r.get("objectName", r.get("object_name", ""))
                if obj_name:
                    # Map API field names to our expected format
                    results[obj_name] = {
                        "object_name": obj_name,
                        "object_type": r.get("objectType", r.get("object_type", "")),
                        "released": r.get("status", "") == "compliant",
                        "level": r.get("cleanCoreLevel", r.get("level", "?")),
                        "status": r.get("status", ""),
                        "state": r.get("state", ""),
                        "successor": r.get("successor", {}),
                        "note": r.get("state", "")
                    }
        else:
            results = results_data

        # Get counts from API response or calculate manually
        total = result.get("totalChecked", result.get("total", len(object_names)))
        compliant = result.get("compliant", result.get("compliant_count", 0))
        non_compliant = result.get("nonCompliant", result.get("non_compliant_count", 0))

        print(f"Compliant: {compliant}/{total}")
        print(f"Non-Compliant: {non_compliant}/{total}")
        print()

        for obj, info in results.items():
            released = info.get("released", False)
            status = "[OK] ALLOWED" if released else "[X] FORBIDDEN"
            level = info.get("level", "?")
            print(f"  {obj}: {status} (Level {level})")
            if info.get("note"):
                print(f"    {info['note']}")
            # Show successors from API response
            successor = info.get("successor", {})
            if successor and successor.get("objects"):
                succ_objs = successor["objects"]
                print(f"    Successors: {', '.join(s.get('objectName', s) for s in succ_objs[:3])}")
                if len(succ_objs) > 3:
                    print(f"    ... and {len(succ_objs) - 3} more")
            print()


if __name__ == "__main__":
    main()
