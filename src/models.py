"""Client data models for Sandy Bot."""
from dataclasses import dataclass
from typing import Optional, List


@dataclass
class Client:
    id: str
    name: str
    compartment: str
    email: Optional[str] = None
    phone: Optional[str] = None
    interest: int = 3
    status: str = "ACTIVE"
    created_date: Optional[str] = None
    last_contact: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None


@dataclass
class DISCProfile:
    style: str  # D, I, S, C
    d_score: int = 0
    i_score: int = 0
    s_score: int = 0
    c_score: int = 0


@dataclass
class ILWEGoals:
    income: Optional[str] = None
    lifestyle: Optional[str] = None
    wealth: Optional[str] = None
    equity: Optional[str] = None
