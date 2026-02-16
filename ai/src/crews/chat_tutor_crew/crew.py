from crewai import Agent, Crew, Process, Task, Callback
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List, Optional, Dict, Any, Union
from src.crews.base.llm import DEFAULT_LLM
from src.crews.chat_tutor_crew.schemas import TutorResponse, RoutingDecision
from src.crews.chat_tutor_crew.tools import save_word_pair_tool


@CrewBase
class ChatTutorCrew():
    """Crew for handling chat interactions with the language tutor

    This crew uses a conditional routing pattern where the router agent
    determines which specialist agent should handle the request:
    1. Router Agent (route_task) - Analyzes user message and determines intent
    2. Translation Agent (translation_task) - Handles translations and grammar
    3. Vocabulary Agent (vocabulary_task) - Suggests new vocabulary words

    Phoenix traces will show the complete chain: router → specialist
    in a single trace with clear delegation.
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
            output_pydantic=RoutingDecision,
            callback=self._route_callback
        )

    @task
    def translation_task(self) -> Task:
        return Task(
            config=self.tasks_config['translation_task'],
            output_pydantic=TutorResponse,
            agent=self.translation_agent
        )

    @task
    def vocabulary_task(self) -> Task:
        return Task(
            config=self.tasks_config['vocabulary_task'],
            output_pydantic=TutorResponse,
            agent=self.vocabulary_agent
        )

    def _route_callback(self, output: Union[str, RoutingDecision]) -> List[Task]:
        """
        Callback function that determines which specialist task to run next
        based on the router's decision.

        This is the key to the conditional routing pattern - it allows the router
        to dynamically delegate to the appropriate specialist.
        """
        # Parse the routing decision
        if isinstance(output, str):
            import json
            output = json.loads(output)

        # If router declined, return no further tasks
        if not output.get('should_respond', False):
            return []

        # Route to the appropriate specialist
        agent = output.get('agent')

        if agent == 'translation':
            return [self.translation_task()]
        elif agent == 'vocabulary':
            return [self.vocabulary_task()]
        else:
            # No specific agent specified - default to translation
            return [self.translation_task()]

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential
        )
