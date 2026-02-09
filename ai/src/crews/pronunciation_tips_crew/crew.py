from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List
from src.crews.base.llm import DEFAULT_LLM
from src.crews.pronunciation_tips_crew.schemas import PronunciationTipsOutput

@CrewBase
class PronunciationTipsCrew():
    agents: List[BaseAgent]
    tasks: List[Task]

    @agent
    def pronunciation_expert(self) -> Agent:
        return Agent(
            config=self.agents_config['pronunciation_expert'],
            llm=DEFAULT_LLM
        )

    @task
    def pronunciation_analysis_task(self) -> Task:
        return Task(
            config=self.tasks_config['pronunciation_analysis_task'],
            output_pydantic=PronunciationTipsOutput
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential
        )
