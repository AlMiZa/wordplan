from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List, Optional
from src.crews.base.llm import DEFAULT_LLM
from src.crews.chat_tutor_crew.schemas import TutorResponse


@CrewBase
class ChatTutorCrew():
    """Crew for handling chat interactions with the language tutor"""
    agents: List[BaseAgent]
    tasks: List[Task]

    @agent
    def router_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['router_agent'],
            llm=DEFAULT_LLM
        )

    @agent
    def translation_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['translation_agent'],
            llm=DEFAULT_LLM
        )

    @agent
    def vocabulary_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['vocabulary_agent'],
            llm=DEFAULT_LLM
        )

    @task
    def route_task(self) -> Task:
        return Task(
            config=self.tasks_config['route_task'],
            output_pydantic=TutorResponse
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential
        )
