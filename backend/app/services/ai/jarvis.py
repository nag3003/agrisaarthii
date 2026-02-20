import os
import json
import re
import asyncio
from groq import AsyncGroq
from app.core.registry import SkillRegistry
from app.core.config import settings

class JarvisEngine:
    def __init__(self, registry: SkillRegistry):
        self.registry = registry
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.model_name = "llama-3.3-70b-versatile"
        
        self.system_instruction = (
            "You are AgriSarathi, an intelligent agricultural AI assistant. "
            "Use the provided tools to answer the user's request. "
            "Your answers must be concise (max 2 sentences) and optimized for voice output. "
            "If the user asks for advice, use get_crop_advice. "
            "If the user asks for prices, use get_market_prices. "
            "When using tools, output VALID JSON arguments only."
        )

    async def run_conversation(self, user_prompt: str) -> str:
        messages = [
            {"role": "system", "content": self.system_instruction},
            {"role": "user", "content": user_prompt}
        ]
        
        response = None
        
        try:
            tools_schema = self.registry.get_tools_schema()
            
            completion_kwargs = {
                "model": self.model_name,
                "messages": messages,
                "max_tokens": 200
            }
            
            if tools_schema:
                completion_kwargs["tools"] = tools_schema
                completion_kwargs["tool_choice"] = "auto"
            
            response = await self.client.chat.completions.create(**completion_kwargs)
            
        except Exception as e:
            # Handle tool_use_failed error from Groq
            error_str = str(e)
            if "tool_use_failed" in error_str and "failed_generation" in error_str:
                try:
                    # Extract failed generation from error message (it's inside the dict string)
                    # We look for <function=NAME{ARGS}</function> pattern
                    match = re.search(r"<function=(\w+)(\{.*?\})<\/function>", error_str)
                    if match:
                        func_name = match.group(1)
                        func_args_str = match.group(2)
                        print(f"DEBUG: Recovered failed tool call: {func_name} with {func_args_str}")
                        
                        function_to_call = self.registry.get_function(func_name)
                        if function_to_call:
                            try:
                                args = json.loads(func_args_str)
                                if asyncio.iscoroutinefunction(function_to_call):
                                    res = await function_to_call(**args)
                                else:
                                    res = function_to_call(**args)
                                return str(res) # Return result directly as if it was the answer
                            except Exception as exec_e:
                                return f"Error executing recovered tool: {exec_e}"
                except Exception as parse_e:
                    print(f"Failed to recover tool call: {parse_e}")

            print(f"Groq API Error: {e}")
            print("Using Mock Fallback for Jarvis...")
            return await self._mock_fallback(user_prompt)

        # Process the successful response
        if not response or not response.choices:
            return await self._mock_fallback(user_prompt)

        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        # CASE 1: AI wants to use a tool (Action)
        if tool_calls:
            print("DEBUG: Executing Tool...")
            messages.append(response_message)

            for tool_call in tool_calls:
                function_name = tool_call.function.name
                function_to_call = self.registry.get_function(function_name)
                
                if not function_to_call:
                    res = "Error: Tool not found."
                else:
                    try:
                        function_args = json.loads(tool_call.function.arguments)
                        if function_args is None:
                            function_args = {}
                            
                        # Handle Async vs Sync tools
                        if asyncio.iscoroutinefunction(function_to_call):
                            res = await function_to_call(**function_args)
                        else:
                            res = function_to_call(**function_args)
                            
                    except Exception as e:
                        res = f"Error executing tool: {e}"
                
                messages.append(
                    {
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": str(res),
                    }
                )

            # Get final response after tool execution
            try:
                second_response = await self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages
                )
                return second_response.choices[0].message.content
            except Exception as e:
                 print(f"Groq API Error during second step: {e}")
                 return await self._mock_fallback(user_prompt)

        # CASE 2: AI answers directly
        return response_message.content

    async def _mock_fallback(self, prompt: str) -> str:
        prompt_lower = prompt.lower()
        
        async def call_safe(func_name, *args):
            func = self.registry.get_function(func_name)
            if not func: return None
            if asyncio.iscoroutinefunction(func):
                return await func(*args)
            return func(*args)

        # Simple keyword matching to trigger skills
        if "weather" in prompt_lower:
            res = await call_safe("get_weather", "Delhi")
            if res: return f"Currently in New Delhi: {res}"
        
        if "price" in prompt_lower or "market" in prompt_lower or "mandi" in prompt_lower:
            # Extract crop name or default to Wheat
            crop = "wheat"
            if "rice" in prompt_lower: crop = "rice"
            elif "tomato" in prompt_lower: crop = "tomato"
            elif "onion" in prompt_lower: crop = "onion"
            
            res = await call_safe("get_market_prices", crop, "Delhi")
            if res: return f"Here are the latest market prices: {res}"

        if "joke" in prompt_lower:
            res = await call_safe("tell_joke")
            if res: return res
                
        if "advice" in prompt_lower or "crop" in prompt_lower or "disease" in prompt_lower:
            # Extract crop
            crop = "wheat"
            if "rice" in prompt_lower: crop = "rice"
            elif "tomato" in prompt_lower: crop = "tomato"
            
            res = await call_safe("get_crop_advice", f"Advice for {crop}: {prompt}")
            if res: return f"Here is some advice: {res}"

        if "who are you" in prompt_lower:
            return "I am AgriSarathi, your personal farming assistant."
            
        if "hello" in prompt_lower or "hi" in prompt_lower:
            return "Hello! How can I help you with your farming today?"

        # Enhanced Fallback Message
        return "I'm experiencing some connection issues with my main brain, but I'm still here. You can ask me about weather, market prices, or crop advice, and I'll do my best to help using my local knowledge."
