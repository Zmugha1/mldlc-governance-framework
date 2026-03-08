"""
Entity extraction for GraphRAG.
Extracts people, organizations, locations, events, and concepts from text.
"""
import re
from typing import List, Dict, Tuple
from dataclasses import dataclass

try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        nlp = spacy.load("en_core_web_lg")
    HAS_SPACY = True
except (ImportError, OSError):
    nlp = None
    HAS_SPACY = False


@dataclass
class Entity:
    id: str
    text: str
    label: str
    type: str
    source: str
    context: str


@dataclass
class Relationship:
    source_id: str
    target_id: str
    relation_type: str
    evidence: str
    confidence: float


class EntityExtractor:
    ENTITY_TYPE_MAP = {
        "PERSON": "person", "ORG": "organization", "GPE": "location",
        "LOC": "location", "FAC": "location", "EVENT": "event",
        "WORK_OF_ART": "concept", "PRODUCT": "concept", "LAW": "concept",
        "DATE": "event", "TIME": "event",
    }

    RELATIONSHIP_PATTERNS = {
        "works_for": [r"(\w+)\s+(?:works?\s+for|employed\s+by)\s+(\w+)"],
        "reports_to": [r"(\w+)\s+(?:reports?\s+to|managed\s+by)\s+(\w+)"],
        "partnered_with": [r"(\w+)\s+(?:partnered\s+with|collaborates?\s+with)\s+(\w+)"],
        "supplies_to": [r"(\w+)\s+(?:supplies?|provides?)\s+(?:to|for)\s+(\w+)"],
        "located_in": [r"(\w+)\s+(?:located\s+in|based\s+in)\s+(\w+)"],
    }

    def __init__(self):
        self.entity_counter = 0

    def _generate_entity_id(self, text: str, label: str) -> str:
        self.entity_counter += 1
        clean = re.sub(r"\W+", "_", text.lower())[:30]
        return f"{label.lower()}_{clean}_{self.entity_counter}"

    def extract_entities(self, text: str, source: str = "unknown") -> List[Entity]:
        entities = []
        if HAS_SPACY and nlp:
            doc = nlp(text[:100000])
            for ent in doc.ents:
                if ent.label_ in self.ENTITY_TYPE_MAP:
                    entities.append(Entity(
                        id=self._generate_entity_id(ent.text, ent.label_),
                        text=ent.text, label=ent.label_,
                        type=self.ENTITY_TYPE_MAP[ent.label_],
                        source=source,
                        context=text[max(0, ent.start_char - 50):min(len(text), ent.end_char + 50)],
                    ))
        else:
            for m in re.finditer(r"\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b", text):
                phrase = m.group(1)
                if len(phrase) > 2:
                    entities.append(Entity(
                        id=self._generate_entity_id(phrase, "ORG"),
                        text=phrase, label="ORG", type="organization",
                        source=source, context=m.group(0)[:100],
                    ))
        return entities

    def extract_relationships(self, text: str, entities: List[Entity]) -> List[Relationship]:
        rels = []
        for rel_type, patterns in self.RELATIONSHIP_PATTERNS.items():
            for pat in patterns:
                for m in re.finditer(pat, text, re.IGNORECASE):
                    s, t = m.group(1).strip().lower(), m.group(2).strip().lower()
                    se = next((e for e in entities if e.text.lower() == s), None)
                    te = next((e for e in entities if e.text.lower() == t), None)
                    if se and te and se.id != te.id:
                        rels.append(Relationship(se.id, te.id, rel_type, m.group(0), 0.8))
        return rels

    def process_document(self, document: Dict) -> Tuple[List[Entity], List[Relationship]]:
        text = document.get("content", "")
        source = document.get("source", "unknown")
        entities = self.extract_entities(text, source)
        return entities, self.extract_relationships(text, entities)
