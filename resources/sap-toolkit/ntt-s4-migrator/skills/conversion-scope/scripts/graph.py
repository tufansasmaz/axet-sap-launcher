"""In-memory networkx multidigraph joining items x findings x usage x notes."""

import networkx as nx

from scripts.schemas import ATCFinding, NoteText, ReadinessTile, SimplificationItem, UsageRow


def build_graph(
    items: list[SimplificationItem],
    findings: list[ATCFinding],
    usage: list[UsageRow],
    notes: list[NoteText],
    rc_tiles: list[ReadinessTile],
) -> nx.MultiDiGraph:
    """Build a MultiDiGraph joining items, findings, usage rows, notes, and RC tiles.

    Node IDs::

        ("item", sap_note_number)
        ("finding", object_name, line)
        ("object", object_name)
        ("note", note_number)
        ("rc_tile", tile_name)

    Edges::

        finding -> item   kind="references"   (matched by sap_note)
        finding -> object kind="affects"      (when a usage row exists for the object)
        item    -> note   kind="documented_by"

    RC tiles are added as standalone nodes so downstream deliverable writers can
    enumerate which Readiness Check tiles a run covered. Tiles are NOT auto-edged
    to items/findings because tile row schemas vary by SAP RC version and per-tile
    join keys would have to be discovered empirically — that's part of the v0.2
    schema-discovery work. Until then, callers inspect rc_tile nodes directly.
    """
    g: nx.MultiDiGraph = nx.MultiDiGraph()

    # --- nodes ---
    for it in items:
        g.add_node(("item", it.sap_note_number), kind="item", data=it)

    for f in findings:
        g.add_node(("finding", f.object_name, f.line), kind="finding", data=f)

    for u in usage:
        g.add_node(("object", u.object_name), kind="object", data=u)

    for n in notes:
        g.add_node(("note", n.note_number), kind="note", data=n)

    for t in rc_tiles:
        g.add_node(("rc_tile", t.tile_name), kind="rc_tile", data=t)

    # --- edges ---

    # finding → item (by matching sap_note)
    for f in findings:
        if f.sap_note is None:
            continue
        item_node = ("item", f.sap_note)
        if item_node in g.nodes:
            g.add_edge(("finding", f.object_name, f.line), item_node, kind="references")

    # finding → object (when a usage row exists for that object)
    for f in findings:
        obj_node = ("object", f.object_name)
        if obj_node in g.nodes:
            g.add_edge(("finding", f.object_name, f.line), obj_node, kind="affects")

    # item → note (when a note entry exists with the same note_number)
    for it in items:
        note_node = ("note", it.sap_note_number)
        if note_node in g.nodes:
            g.add_edge(("item", it.sap_note_number), note_node, kind="documented_by")

    return g
