"""Builds the fictional 'Experimental Engineering' demo team (v31). All names are invented."""
import json, uuid
NS = uuid.UUID("6f1c1a52-7c1e-4c5e-9b1a-ee0000000031")
uid = lambda s: str(uuid.uuid5(NS, s))

P = {  # key: (name, role, fullAt or None, status, note)
 "prof":  ("Helena Strand", "Professor", None, "full", "Centre board meetings this term"),
 "assoc": ("Marek Nowak", "Associate professor", None, "full", ""),
 "asst":  ("Sofia Lind", "Assistant professor", None, "steady", ""),
 "res1":  ("Anders Holm", "Researcher", None, "steady", ""),
 "res2":  ("Priya Raman", "Researcher", None, "full", "Two proposals in December"),
 "pd1":   ("Lucas Moreau", "Postdoctoral researcher", None, "steady", ""),
 "pd2":   ("Yuki Tanaka", "Postdoctoral researcher", None, "room", "Can take on lab work"),
 "re1":   ("Karin Ek", "Research engineer", None, "steady", "Lab coordinator"),
 "re2":   ("Oskar Berg", "Research engineer", None, "full", ""),
 "re3":   ("Nadia Haddad", "Research engineer", 90, "steady", "Works 90%"),
 "phd1":  ("Emil Sjoberg", "PhD candidate", None, "steady", ""),
 "phd2":  ("Ines Carvalho", "PhD candidate", None, "full", "Licentiate in spring"),
 "phd3":  ("David Okafor", "PhD candidate", None, "room", ""),
 "iphd1": ("Johanna Falk", "Industrial PhD candidate", 50, "steady", "50% at the company"),
 "iphd2": ("Viktor Lund", "Industrial PhD candidate", 50, "steady", "50% at the company"),
 "iphd3": ("Mei Chen", "Industrial PhD candidate", 50, "full", "50% at the company"),
 "iphd4": ("Rasmus Dahl", "Industrial PhD candidate", 50, "room", "50% at the company"),
 "am1":   ("Elsa Norberg", "Amanuensis", 20, "steady", "20%, lab assistant"),
 "am2":   ("Filip Aho", "Amanuensis", 20, "room", "20%, teaching assistant"),
 "am3":   ("Leila Karimi", "Amanuensis", 20, "steady", "20%, teaching assistant"),
 "vis":   ("Tomasz Wierzbicki", "Visiting researcher", None, "steady", "Visiting Sep 2026 to Feb 2027"),
 "vs1":   ("Ana Ruiz", "Visiting student", None, "room", "Exchange, autumn 2026"),
 "vs2":   ("Jonas Weber", "Visiting student", None, "steady", "Exchange, until June 2027"),
 "vs3":   ("Aiko Mori", "Visiting student", None, "room", "Exchange, spring 2027"),
}
people = []
for k, (n, r, full, st, note) in P.items():
    x = {"id": uid(k), "name": n, "capacityHours": 40, "reservedHours": 0, "notes": "", "role": r, "status": st}
    if note: x["statusNote"] = note
    if full: x["fullAt"] = full
    # v38: illustrated, fictional portraits drawn by scripts/build-portraits.cjs
    pic = __import__("os").path.join(__import__("os").path.dirname(__file__), "..", "demo-data", "portraits", __import__("re").sub("[^a-z]+", "-", n.lower()) + ".jpg")
    if __import__("os").path.exists(pic):
        x["photo"] = "data:image/jpeg;base64," + __import__("base64").b64encode(open(pic, "rb").read()).decode()
    people.append(x)

C1 = "CFS: Centre for Functional Surfaces"
C2 = "DMC: Digital Manufacturing Centre"
periods = [
 {"id": "p1", "name": "Period 1", "start": "2026-08-31", "end": "2026-10-30"},
 {"id": "p2", "name": "Period 2", "start": "2026-11-02", "end": "2027-01-15"},
 {"id": "p3", "name": "Period 3", "start": "2027-01-18", "end": "2027-03-19"},
 {"id": "p4", "name": "Period 4", "start": "2027-03-22", "end": "2027-06-04"},
]
# Research projects: key, abbr, short name, full title, status, funder, centre, start, end, pi, description, milestones
R = [
 ("tex", "TEXFLOW", "Textured flow surfaces", "TEXFLOW: Laser-textured surfaces for controlled fluid flow in heat exchangers", "ongoing", "Research council", C1, "2024-01-01", "2027-12-31", "prof", "Laser texturing and wetting tests on aluminium heat-exchanger plates.",
  [("milestone", "Prototype plates tested", "2026-06-15", True), ("deadline", "Annual report to centre", "2026-12-15", False), ("deadline", "Final report", "2028-02-28", False)]),
 ("coat", "COATRIB", "Coating tribology", "COATRIB: Tribological performance of thin hard coatings on textured steel", "ongoing", "Industry consortium", C1, "2025-03-01", "2028-02-29", "assoc", "Pin-on-disc and reciprocating tests on PVD-coated textured samples.",
  [("deadline", "D2.1 Test matrix", "2026-11-30", False), ("milestone", "Mid-term review", "2026-09-10", True)]),
 ("bio", "BIOSURF", "Bio-inspired surfaces", "BIOSURF: Bio-inspired anti-fouling surfaces made by ultrashort-pulse laser", "ongoing", "Strategic foundation", C1, "2026-01-01", "2029-12-31", "asst", "Hierarchical micro and nano structures; fouling trials with a partner.",
  [("deadline", "Data management plan", "2026-12-01", False), ("milestone", "First field trial", "2027-05-15", False)]),
 ("ruff", "ROUGHMET", "Roughness traceability", "ROUGHMET: Traceable areal roughness measurement for additively manufactured parts", "granted", "Innovation agency", C1, "2027-01-01", "2028-12-31", "res1", "Reference artefacts and uncertainty budgets for AM surfaces.",
  [("milestone", "Kick-off", "2027-01-20", False)]),
 ("twin", "TWINMILL", "Digital twin milling", "TWINMILL: A digital twin for adaptive milling of thin-walled components", "ongoing", "Innovation agency", C2, "2025-09-01", "2028-08-31", "res2", "Process model and in-line sensing for chatter-free milling.",
  [("deadline", "D1.3 Sensor setup report", "2026-12-18", False), ("milestone", "Demonstrator at partner", "2027-09-30", False)]),
 ("mon", "SENSEGRIND", "In-process grinding monitoring", "SENSEGRIND: Acoustic emission and power monitoring for in-process grinding quality", "ongoing", "Industry consortium", C2, "2024-06-01", "2027-05-31", "assoc", "Monitoring models trained on grinding trials with two partners.",
  [("deadline", "Final demonstration", "2027-05-15", False), ("milestone", "Model v2 released", "2026-10-01", True)]),
 ("aiq", "AIQ", "AI quality prediction", "AIQ: Machine learning for predictive quality in precision machining lines", "planned", "EU programme", C2, "2027-03-01", "2030-02-28", "prof", "Predictive quality models from machine and metrology data.",
  [("milestone", "Consortium agreement signed", "2027-02-15", False)]),
 ("am", "AMFIN", "AM finishing", "AMFIN: Hybrid finishing of additively manufactured titanium parts", "ongoing", "Research council", None, "2023-09-01", "2026-12-31", "res1", "Machining and abrasive finishing of AM titanium.",
  [("deadline", "Final report", "2027-02-28", False)]),
 ("opt", "OPTIQ", "Optical in-line metrology", "OPTIQ: Fast optical in-line measurement of surface topography", "ongoing", "Innovation agency", None, "2025-01-01", "2027-06-30", "res2", "Fringe projection and confocal sensors in production.",
  [("milestone", "Line trial", "2027-03-15", False)]),
 ("cool", "CRYOCUT", "Cryogenic cutting", "CRYOCUT: Cryogenic cooling for sustainable machining of nickel alloys", "ongoing", "Strategic foundation", None, "2026-03-01", "2029-02-28", "asst", "Tool wear and surface integrity under cryogenic cooling.",
  [("deadline", "Paper to CIRP Annals", "2027-01-08", False)]),
 ("gear", "GEARSURF", "Gear surface integrity", "GEARSURF: Surface integrity of hard-finished gears for electric drivelines", "ongoing", "Industry partner", None, "2024-09-01", "2028-08-31", "prof", "Industrial PhD projects with two drivetrain partners.",
  [("milestone", "Licentiate seminar", "2027-04-20", False)]),
 ("prop", "CIRCMAN", "Circular manufacturing", "CIRCMAN: Remanufacturing of precision components for a circular economy", "submitted", "EU programme", None, None, None, "assoc", "Proposal submitted, decision expected in spring.",
  []),
 ("old", "MICROMOLD", "Micro moulding", "MICROMOLD: Micro-structured mould inserts for polymer replication", "finished", "Research council", None, "2022-01-01", "2025-12-31", "res1", "Finished project; results published.",
  []),
]
projects = []
for i, (k, ab, nm, ft, st, fu, ce, s, e, pi, de, ms) in enumerate(R):
    p = {"id": uid("p-" + k), "name": nm, "status": st, "notes": "", "type": "Research", "funder": fu}
    if ce: p["centre"] = ce
    if s:
        p["startYear"] = int(s[:4]); p["endYear"] = int(e[:4])
        p["dates"] = {"start": s, "end": e}
    if st == "submitted":
        p["dates"] = {"appStart": "2026-06-01", "appDue": "2026-10-15", "decisionOn": "2027-03-31", "plannedStart": "2027-09-01", "plannedEnd": "2030-08-31"}
    p["description"] = de
    p["piId"] = uid(pi); p["abbreviation"] = ab; p["fullTitle"] = ft
    if ms:
        p["milestones"] = [{"id": f"m-{k}{j}", "kind": a, "title": t, "date": d, **({"done": True} if dn else {})} for j, (a, t, d, dn) in enumerate(ms)]
    projects.append(p)

def teach(k, name, desc, per, wh, resp, extname=None, days=None, var=False, ms=None):
    sch = {"mode": "periods", "periodIds": per, "weekHours": wh}
    if var: sch["variableDays"] = True
    if days: sch["weekdays"] = days
    x = {"id": uid("t-" + k), "kind": "teaching", "name": name, "status": "ongoing", "notes": "", "description": desc, "schedule": sch}
    if resp: x["roles"] = [{"role": "Course responsible", "personId": uid(resp), "name": P[resp][0]}]
    elif extname: x["roles"] = [{"role": "Course responsible", "name": extname}]
    if ms: x["milestones"] = ms
    projects.append(x)
teach("c1", "EE2110 Surface metrology", "Master course: lectures, labs and project.", ["p1"], 6, "asst", days=[1, 3], ms=[{"id": "m-c1", "kind": "deadline", "title": "Exam grading", "date": "2026-11-20", "done": True}])
teach("c2", "EE2230 Precision machining", "Master course with machining labs.", ["p2"], 8, "assoc", days=[0, 2], ms=[{"id": "m-c2", "kind": "deadline", "title": "Exam grading", "date": "2027-02-05"}])
teach("c3", "EE1050 Manufacturing processes", "Large first-year course, irregular lab days.", ["p3"], 10, "res1", var=True)
teach("c4", "EE2400 Digital manufacturing", "Project course with industry cases.", ["p4"], 6, "res2", days=[3])
teach("g1", "Guest lecture: ME2015 Tribology", "Two guest lectures on textured surfaces in another department's course.", ["p2"], 2, None, extname="Course responsible at Mechanics (external)", var=True)
teach("g2", "Guest lecture: MT1020 Materials science", "Guest lecture on surface integrity.", ["p1"], 2, None, extname="Course responsible at Materials (external)", var=True)
teach("g3", "Guest lecture: IE2300 Industrial AI", "Guest lectures on ML for quality prediction.", ["p3"], 2, None, extname="Course responsible at Industrial Engineering (external)", var=True)
teach("g4", "Guest lecture: SD2500 Sustainable production", "Guest lecture on cryogenic machining.", ["p4"], 2, None, extname="Course responsible at Sustainability (external)", var=True)
projects.append({"id": uid("sup"), "kind": "supervision", "name": "PhD supervision", "status": "ongoing", "notes": "", "description": "Main and assistant supervision of the team's PhD and industrial PhD candidates.", "schedule": {"mode": "span", "start": "2023-09-01", "end": "2031-06-30"},
  "roles": [{"role": "Supervisor", "personId": uid("prof"), "name": P["prof"][0]}, {"role": "Assistant supervisor", "personId": uid("asst"), "name": P["asst"][0]}]})
projects.append({"id": uid("host"), "kind": "networking", "name": "Visiting researcher programme", "status": "ongoing", "notes": "", "description": "Hosting the visiting researcher and the exchange students.", "schedule": {"mode": "event", "start": "2026-09-01", "end": "2027-06-30"},
  "roles": [{"role": "Host", "personId": uid("assoc"), "name": P["assoc"][0]}]})

# Assignments: (person, project key prefix, percent, [(task, pct)], status)
A = [
 ("prof","p-tex",20,[("t-coordination",10),("t-writing",10)]), ("prof","p-gear",15,[("t-supervision",15)]), ("prof","p-coat",10,[("t-coordination",10)]), ("prof","p-twin",10,[("t-coordination",10)]), ("prof","p-aiq",5,[("t-writing",5)],"planned"), ("prof","t-c1",0,[]), ("prof","sup",20,[("t-supervision",20)]),
 ("assoc","p-coat",20,[("t-coordination",10),("t-analysis",10)]), ("assoc","p-mon",15,[("t-coordination",15)]), ("assoc","p-prop",5,[("t-writing",5)],"planned"), ("assoc","t-c2",20,[("t-teaching",20)]), ("assoc","host",5,[]), ("assoc","t-g1",3,[("t-teaching",3)]),
 ("asst","p-bio",25,[("t-coordination",10),("t-writing",15)]), ("asst","p-cool",20,[("t-analysis",10),("t-writing",10)]), ("asst","t-c1",20,[("t-teaching",20)]), ("asst","sup",10,[("t-supervision",10)]),
 ("res1","p-am",20,[("t-machining",10),("t-writing",10)]), ("res1","p-ruff",15,[("t-measurement",10),("t-coordination",5)],"planned"), ("res1","t-c3",30,[("t-teaching",30)]), ("res1","t-g2",3,[("t-teaching",3)]),
 ("res2","p-twin",35,[("t-modelling",20),("t-coordination",15)]), ("res2","p-opt",30,[("t-measurement",15),("t-analysis",15)]), ("res2","t-c4",20,[("t-teaching",20)]), ("res2","p-aiq",10,[("t-writing",10)],"planned"), ("res2","t-g3",3,[("t-teaching",3)]),
 ("pd1","p-tex",50,[("t-testing",25),("t-analysis",15),("t-writing",10)]), ("pd1","p-bio",30,[("t-setup",10),("t-testing",20)]),
 ("pd2","p-mon",60,[("t-analysis",40),("t-modelling",20)]), ("pd2","t-g4",3,[("t-teaching",3)]),
 ("re1","p-coat",40,[("t-testing",30),("t-setup",10)]), ("re1","p-tex",20,[("t-setup",20)]), ("re1","t-c1",10,[("t-teaching",10)]),
 ("re2","p-twin",50,[("t-setup",20),("t-machining",30)]), ("re2","p-cool",40,[("t-machining",40)]), ("re2","t-c2",15,[("t-teaching",15)]),
 ("re3","p-opt",40,[("t-measurement",40)]), ("re3","p-ruff",20,[("t-measurement",20)],"planned"), ("re3","t-c3",20,[("t-teaching",20)]),
 ("phd1","p-tex",80,[("t-testing",30),("t-analysis",30),("t-writing",20)]), ("phd1","t-c1",10,[("t-teaching",10)]),
 ("phd2","p-coat",80,[("t-testing",40),("t-writing",40)]), ("phd2","t-c2",15,[("t-teaching",15)]),
 ("phd3","p-bio",70,[("t-setup",20),("t-testing",30),("t-analysis",20)]), ("phd3","t-c4",10,[("t-teaching",10)]),
 ("iphd1","p-gear",50,[("t-measurement",25),("t-analysis",25)]),
 ("iphd2","p-gear",50,[("t-testing",30),("t-writing",20)]),
 ("iphd3","p-mon",50,[("t-analysis",30),("t-writing",20)]), ("iphd3","p-twin",15,[("t-modelling",15)]),
 ("iphd4","p-am",40,[("t-machining",40)]),
 ("am1","p-tex",10,[("t-setup",10)]), ("am1","p-coat",10,[("t-testing",10)]),
 ("am2","t-c3",20,[("t-teaching",20)]),
 ("am3","t-c2",10,[("t-teaching",10)]), ("am3","t-c4",10,[("t-teaching",10)]),
 ("vis","p-bio",60,[("t-testing",30),("t-writing",30)]), ("vis","host",0,[]),
 ("vs1","p-tex",50,[("t-testing",50)]), ("vs2","p-twin",60,[("t-modelling",60)]), ("vs3","p-cool",40,[("t-machining",40)],"planned"),
 ("prof","p-old",0,[],"finished"), ("res1","p-old",0,[],"finished"),
]
assignments = []
for row in A:
    pk, prk, pct, tasks = row[:4]; st = row[4] if len(row) > 4 else "ongoing"
    a = {"id": uid(f"a-{pk}-{prk}"), "personId": uid(pk), "projectId": uid(prk), "status": st, "estimated": True, "notes": ""}
    if tasks: a["tasks"] = [{"taskId": t, "percent": v} for t, v in tasks]
    if pct: a["percent"] = pct
    assignments.append(a)
ids = {p["id"] for p in projects}
assert all(a["projectId"] in ids for a in assignments), "bad project key"
plan = {
 "version": 1, "people": people, "projects": projects, "assignments": assignments, "allocations": [], "capacityOverrides": [],
 "settings": {"weekCount": 8, "periods": periods, "overloadPercent": 100},
 "profile": {"abbreviation": "EE", "fullName": "Experimental Engineering",
   "organisation": "Department of Engineering Sciences, Lakeside University of Technology (fictional)",
   "description": "We run experiments from the machine shop to the metrology lab: functional surfaces, precision machining and digital manufacturing. About half of our research runs within two research centres, CFS and DMC, together with industry partners. We teach four courses and give guest lectures in four more.",
   "focus": ["Functional surfaces", "Precision machining", "Digital manufacturing", "Surface metrology"],
   "website": "www.example.org/ee", "email": "ee@example.org", "leadId": uid("prof"), "coordinatorId": uid("re1")},
 "source": "Fictional demo team (Experimental Engineering)",
}
json.dump(plan, open(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "demo-data", "experimental-engineering-demo-team.json"), "w"), indent=1, ensure_ascii=False)
print(len(people), sum(1 for p in projects if "kind" not in p), sum(1 for p in projects if "centre" in p), len(assignments))
