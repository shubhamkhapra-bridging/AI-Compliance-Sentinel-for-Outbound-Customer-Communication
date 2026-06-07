from pydantic import BaseModel, ConfigDict


class AgentInput(BaseModel):
    model_config = ConfigDict(extra="allow")

    context: dict = {}


class AgentOutput(BaseModel):
    model_config = ConfigDict(extra="allow")

    data: dict = {}
    usage: dict = {}
    warnings: list[str] = []
