from abc import ABC, abstractmethod
from models.agent_models import AgentInput, AgentOutput


class BaseAgent(ABC):
    name: str = "base"
    description: str = ""

    @abstractmethod
    async def run(self, input: AgentInput) -> AgentOutput:
        ...

    async def health_check(self) -> bool:
        return True
