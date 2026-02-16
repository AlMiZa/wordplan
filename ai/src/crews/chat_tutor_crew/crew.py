from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List, Optional, Dict, Any
from src.crews.base.llm import DEFAULT_LLM
from src.crews.chat_tutor_crew.schemas import TutorResponse, RoutingDecision
from src.crews.chat_tutor_crew.tools import save_word_pair_tool


@CrewBase
class ChatTutorCrew():
    """Crew for handling chat interactions with the language tutor

    This crew uses a hierarchical routing pattern:
    1. Router agent analyzes the user's message and determines which specialist to call
    2. Translation agent handles translation requests and can save word pairs
    3. Vocabulary agent suggests new words and saves them to the flashcard deck

    Phoenix traces will show the delegation from router to the appropriate specialist.
    """
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
            llm=DEFAULT_LLM,
            tools=[save_word_pair_tool]
        )

    @agent
    def vocabulary_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['vocabulary_agent'],
            llm=DEFAULT_LLM,
            tools=[save_word_pair_tool]
        )

    @task
    def route_task(self) -> Task:
        return Task(
            config=self.tasks_config['route_task'],
            output_pydantic=RoutingDecision
        )

    @task
    def translation_task(self) -> Task:
        return Task(
            config=self.tasks_config['translation_task'],
            output_pydantic=TutorResponse
        )

    @task
    def vocabulary_task(self) -> Task:
        return Task(
            config=self.tasks_config['vocabulary_task'],
            output_pydantic=TutorResponse
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=[self.route_task()],  # Start with routing only
            process=Process.sequential
        )
