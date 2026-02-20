import inspect
from typing import Callable, Dict, List, Optional, Any

class SkillRegistry:
    def __init__(self):
        self._skills: Dict[str, Callable] = {}
        self._schemas: List[Dict[str, Any]] = []

    def register_skill(self, func: Callable):
        """
        Decorator or method to register a function as a skill.
        The function must have a docstring to generate the description.
        """
        name = func.__name__
        self._skills[name] = func
        
        # Basic schema generation from function signature and docstring
        schema = self._generate_schema(func)
        self._schemas.append(schema)
        return func

    def get_tools_schema(self) -> List[Dict[str, Any]]:
        return self._schemas

    def get_function(self, name: str) -> Optional[Callable]:
        return self._skills.get(name)

    def _generate_schema(self, func: Callable) -> Dict[str, Any]:
        """
        Generates a JSON schema for the function compatible with LLM tool calling.
        """
        sig = inspect.signature(func)
        doc = func.__doc__ or "No description provided."
        
        parameters = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        for param_name, param in sig.parameters.items():
            if param_name == "self":
                continue
                
            # Default to string if type not specified
            param_type = "string"
            if param.annotation != inspect.Parameter.empty:
                if param.annotation == int:
                    param_type = "integer"
                elif param.annotation == float:
                    param_type = "number"
                elif param.annotation == bool:
                    param_type = "boolean"
                elif param.annotation == list:
                    param_type = "array"
                elif param.annotation == dict:
                    param_type = "object"
            
            parameters["properties"][param_name] = {
                "type": param_type,
                "description": f"Parameter {param_name}" # Ideally parse docstring for this
            }
            
            if param.default == inspect.Parameter.empty:
                parameters["required"].append(param_name)
                
        return {
            "type": "function",
            "function": {
                "name": func.__name__,
                "description": doc.strip(),
                "parameters": parameters
            }
        }
