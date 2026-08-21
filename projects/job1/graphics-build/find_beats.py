#!/usr/bin/env python3
"""Locate candidate graphic beats by phrase, on the EDITED timeline."""
import json, re, os, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
W = json.load(open('outputs/transcript-cut.json'))['words']
text = ' '.join(w['word'] for w in W)
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', s.lower())
flat = norm(text).split()
starts = [w['start'] for w in W]
ends = [w['end'] for w in W]

PHRASES = [
    ("hook",            "is AI going to take all our jobs"),
    ("who",             "I am a data engineer by training"),
    ("tweet",           "able to build a full video game"),
    ("not-swe",         "Data analytics is not software engineering"),
    ("pipeline",        "starting from data ingestion to data cleansing"),
    ("pipeline-end",    "reverse ETL and activation"),
    ("sources",         "I have an ERP a CRM"),
    ("cdc",             "nice change data capture feed"),
    ("snapshot",        "you get a full snapshot every day"),
    ("pos",             "only give me the brand new sales"),
    ("stack",           "I chose dbt for my data transformation"),
    ("model",           "the model I am using here is Claude Opus 5"),
    ("demo-start",      "So this is what the source system looks like"),
    ("conventions",     "business rules via a markdown file called conventions"),
    ("iterations",      "I ran up to 10 different iterations"),
    ("codify",          "Everything I could codify in the standards"),
    ("tribal",          "call it tribal knowledge"),
    ("verdict",         "In data engineering I would say not yet"),
    ("still-required",  "my expertise is still required"),
    ("cta",             "Do let me know in the comments"),
]

for label, phrase in PHRASES:
    p = norm(phrase).split()
    hit = None
    for i in range(len(flat) - len(p) + 1):
        if flat[i:i + len(p)] == p:
            hit = i
            break
    if hit is None:
        print(f"{label:16s} NOT FOUND: {phrase}")
        continue
    print(f"{label:16s} {starts[hit]:8.2f} -> {ends[hit + len(p) - 1]:8.2f}   "
          f"{' '.join(w['word'] for w in W[hit:hit + len(p)])[:64]}")
