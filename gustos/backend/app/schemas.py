"""Formatul datelor primite de API (validare + curățarea textelor românești)."""

from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, Field, field_validator

from .services import video
from .text import fix_romanian


def _clean(value):
    """Șiruri: ș/ț corecte, fără spații la capete; șirul gol devine None."""
    if isinstance(value, str):
        value = fix_romanian(value)
        return value or None
    return value


Text = Annotated[str | None, BeforeValidator(_clean)]
RequiredText = Annotated[str, BeforeValidator(_clean)]


class IngredientIn(BaseModel):
    group_name: Text = Field(default=None, max_length=100)
    quantity: float | None = Field(default=None, ge=0, le=100000)
    quantity_text: Text = Field(default=None, max_length=50)
    unit: Text = Field(default=None, max_length=30)
    name: RequiredText = Field(min_length=1, max_length=200)
    note: Text = Field(default=None, max_length=200)


class RecipeIn(BaseModel):
    title: RequiredText = Field(min_length=1, max_length=200)
    description: Text = Field(default=None, max_length=5000)
    servings: int | None = Field(default=None, ge=1, le=200)
    prep_time: int | None = Field(default=None, ge=0, le=10000)
    cook_time: int | None = Field(default=None, ge=0, le=10000)
    difficulty: Literal["ușoară", "medie", "dificilă"] | None = None
    category_id: int | None = None
    tags: list[str] = Field(default_factory=list, max_length=30)
    ingredients: list[IngredientIn] = Field(default_factory=list, max_length=200)
    steps: list[str] = Field(default_factory=list, max_length=100)
    tips: Text = Field(default=None, max_length=10000)
    notes: Text = Field(default=None, max_length=10000)
    source_url: Text = Field(default=None, max_length=2000)
    video_url: Text = Field(default=None, max_length=500)
    source_site: Text = Field(default=None, max_length=200)
    original_language: Text = Field(default=None, max_length=10)
    calories_per_serving: float | None = Field(default=None, ge=0, le=100000)

    @field_validator("difficulty", mode="before")
    @classmethod
    def _empty_difficulty(cls, v):
        return _clean(v)

    @field_validator("tags", mode="before")
    @classmethod
    def _clean_tags(cls, v):
        """Tag-uri cu litere mici, fără dubluri și fără goluri, în ordinea primită."""
        result = []
        for tag in v or []:
            tag = _clean(tag)
            if tag and tag.lower() not in result:
                result.append(tag.lower()[:50])
        return result

    @field_validator("steps", mode="before")
    @classmethod
    def _clean_steps(cls, v):
        return [s for s in (_clean(x) for x in v or []) if s]

    @field_validator("source_url")
    @classmethod
    def _http_only(cls, v):
        if v and not v.lower().startswith(("http://", "https://")):
            raise ValueError("Linkul sursei trebuie să înceapă cu http:// sau https://")
        return v

    @field_validator("video_url")
    @classmethod
    def _video_link(cls, v):
        if v and not v.lower().startswith(("http://", "https://")):
            raise ValueError("Linkul video trebuie să înceapă cu http:// sau https://")
        return video.canonical(v)


class CategoryIn(BaseModel):
    name: RequiredText = Field(min_length=1, max_length=60)


class CategoryOrder(BaseModel):
    ids: list[int]


class TagIn(BaseModel):
    name: RequiredText = Field(min_length=1, max_length=50)
