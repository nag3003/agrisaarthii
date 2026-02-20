import speech_recognition as sr 
import pyttsx3 
import pywhatkit 
import wikipedia 
import pyjokes 
import datetime 
import threading 
import tkinter as tk 
from PIL import Image, ImageTk, ImageEnhance, ImageOps 
import math 
import time 
import os

# ===================================== 
# VOICE ENGINE 
# ===================================== 
listener = sr.Recognizer() 
engine = pyttsx3.init() 
 
voices = engine.getProperty('voices') 
# Select a natural sounding voice if available
if len(voices) > 1:
    engine.setProperty('voice', voices[1].id) 
else:
    engine.setProperty('voice', voices[0].id)

def talk(text): 
    print("Assistant:", text) 
    engine.say(text) 
    engine.runAndWait() 
 
# ===================================== 
# COMMAND HANDLER 
# ===================================== 
def take_command(): 
    try: 
        with sr.Microphone() as source: 
            print("Listening...") 
            start_ripple()      # 🔵 Start ripple on listen 
            listener.adjust_for_ambient_noise(source, duration=1) 
            voice = listener.listen(source, timeout=5, phrase_time_limit=5) 
            stop_ripple()       # 🟣 Stop ripple after listening 
 
            command = listener.recognize_google(voice).lower() 
            print(f"User said: {command}")

            # Wake words: 'alexa', 'agri', 'saarthi'
            wake_words = ['alexa', 'agri', 'saarthi', 'assistant']
            for word in wake_words:
                if word in command:
                    return command.replace(word, '').strip()
            
            return command.strip() # If no wake word, still process for this standalone demo
    except Exception as e: 
        print(f"Error in take_command: {e}")
        stop_ripple() 
        return "" 
 
def run_assistant(): 
    talk("Hello! I am Agri Saarthi, your farming assistant. How can I help you today?")
    while True: 
        command = take_command() 
        if not command:
            continue

        print(f"Processing command: {command}")

        # 1. Multimedia & Info
        if 'play' in command: 
            song = command.replace('play', '').strip() 
            talk("Playing " + song) 
            pywhatkit.playonyt(song) 
 
        elif 'time' in command: 
            current_time = datetime.datetime.now().strftime('%I:%M %p') 
            talk("The time is " + current_time) 
 
        elif 'who is' in command or 'who the heck is' in command: 
            person = command.replace('who is', '').replace('who the heck is', '').strip() 
            try: 
                info = wikipedia.summary(person, sentences=1) 
                talk(info) 
            except: 
                talk("Couldn't find information about " + person) 
 
        # 2. AgriSaarthi App Functions
        elif 'weather' in command or 'forecast' in command:
            talk("Opening Weather Forecast. Current temperature in your area is 30 degrees Celsius with clear skies. No rain expected today.")
            # In a real app, this could trigger a deep link or API call
            
        elif 'calculator' in command or 'calculate' in command:
            talk("Launching Fertilizer Calculator. Please tell me your land size and crop type to calculate requirements.")
            
        elif 'crop doctor' in command or 'scan' in command or 'disease' in command:
            talk("Opening AI Crop Doctor. Please take a clear photo of the affected leaf so I can diagnose the issue.")
            
        elif 'soil' in command or 'moisture' in command or 'nutrient' in command:
            talk("Checking Soil Health. Your last sensor reading showed 45% moisture level. Nitrogen and Potassium levels are optimal.")
            
        elif 'market' in command or 'price' in command or 'mandi' in command:
            talk("Fetching Market Prices. Today's price for Onion in Nashik is 2,400 rupees per quintal. Prices are up by 2 percent.")
            
        elif 'scheme' in command or 'government' in command:
            talk("Scanning Government Schemes. You are eligible for the PM-Kisan Samman Nidhi. Would you like to see the application details?")

        elif 'task' in command or 'todo' in command or 'calendar' in command:
            talk("Opening your Tasks. You have 3 pending items: Watering the cotton field, checking pest traps, and buying seeds.")

        elif 'machinery' in command or 'rent' in command:
            talk("Opening Machinery Hub. There are 2 tractors and 1 harvester available for rent in your nearby village.")

        # 3. Conversational
        elif 'joke' in command: 
            talk(pyjokes.get_joke()) 
 
        elif 'date' in command: 
            talk("Sorry, I have a headache today.") 
 
        elif 'are you single' in command: 
            talk("I am in a relationship with Wi-Fi.") 

        elif 'stop' in command or 'exit' in command or 'bye' in command:
            talk("Goodbye! Happy farming with Agri Saarthi.")
            break
 
        elif command != "": 
            talk("I heard you say " + command + ". Could you please repeat that or ask for a specific app function?") 
 
# ===================================== 
# GUI — Tkinter + Animations 
# ===================================== 
 
root = tk.Tk() 
root.title("Agri Saarthi - AI Voice Assistant") 
root.geometry("700x850") 
root.configure(bg="#050505") 
 
# Load the orb with fallback
orb_path = "orb.png"
if os.path.exists(orb_path):
    base_img = Image.open(orb_path).resize((350, 350), Image.Resampling.LANCZOS) 
else:
    # Create a simple colored circle if image missing
    print(f"Warning: {orb_path} not found. Using fallback graphic.")
    base_img = Image.new('RGB', (350, 350), color='#27AE60')
    from PIL import ImageDraw
    draw = ImageDraw.Draw(base_img)
    draw.ellipse([50, 50, 300, 300], fill='#27AE60', outline='#FFFFFF', width=5)

orb_frame = tk.Label(root, bg="#050505") 
orb_frame.pack(pady=50) 
 
# Animation Variables 
breath_scale = 1.0 
breath_direction = 1 
hue_shift = 0 
ripple_active = False 
ripple_radius = 0 
 
def animate_orb(): 
    global breath_scale, breath_direction, hue_shift 
 
    # ---------------------- 
    # (1) Breathing Effect 
    # ---------------------- 
    breath_scale += 0.005 * breath_direction 
    if breath_scale >= 1.08: 
        breath_direction = -1 
    elif breath_scale <= 0.92: 
        breath_direction = 1 
 
    # Resize image for breathing 
    scaled_size = int(350 * breath_scale) 
    img = base_img.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS) 
 
    # ---------------------- 
    # (2) Rainbow Color Shift 
    # ---------------------- 
    hue_shift += 1 
    hue_shift %= 360 
 
    hsv = ImageEnhance.Color(img).enhance(2.0) 
    # Note: Simplified color shift for compatibility
    try:
        hsv = ImageOps.colorize(hsv.convert("L"), black="black", white=f"hsv({hue_shift}, 90%, 90%)") 
        img = Image.blend(img.convert("RGB"), hsv.convert("RGB"), 0.4) 
    except:
        pass # Fallback if colorize fails on some systems
 
    # Convert to Tk image 
    tk_img = ImageTk.PhotoImage(img) 
    orb_frame.config(image=tk_img) 
    orb_frame.image = tk_img 
 
    root.after(20, animate_orb) 
 
# ---------------------- 
# (3) Ripple Animation 
# ---------------------- 
def start_ripple(): 
    global ripple_active 
    ripple_active = True 
 
def stop_ripple(): 
    global ripple_active 
    ripple_active = False 
 
def ripple_loop(): 
    global ripple_radius 
    if ripple_active: 
        ripple_radius += 4 
        if ripple_radius > 300: 
            ripple_radius = 0 
 
    # Draw ripple using tk.Canvas 
    canvas.delete("all") 
    if ripple_active: 
        canvas.create_oval( 
            350 - ripple_radius, 350 - ripple_radius, 
            350 + ripple_radius, 350 + ripple_radius, 
            outline="#44aaff", 
            width=3 
        ) 
 
    root.after(30, ripple_loop) 
 
# Canvas for ripple 
canvas = tk.Canvas(root, width=700, height=700, bg="#050505", highlightthickness=0) 
canvas.place(x=0, y=100) 
 
orb_frame.lift() 
 
def start_assistant_thread(): 
    t = threading.Thread(target=run_assistant) 
    t.daemon = True 
    t.start() 
    btn.config(state="disabled", text="ASSISTANT ACTIVE", bg="#27AE60")

# UI Labels
title_label = tk.Label(root, text="AGRI SAARTHI", font=("Helvetica", 24, "bold"), fg="#27AE60", bg="#050505")
title_label.pack(pady=10)

status_label = tk.Label(root, text="Ready to help our farmers", font=("Helvetica", 14), fg="#666", bg="#050505")
status_label.pack()

btn = tk.Button(
    root, 
    text="START ASSISTANT", 
    font=("Helvetica", 18, "bold"), 
    command=start_assistant_thread,
    bg="#27AE60",
    fg="white",
    padx=20,
    pady=10,
    borderwidth=0,
    activebackground="#2ECC71"
) 
btn.pack(pady=30) 
 
# Help Text
help_text = tk.Label(
    root, 
    text="Try saying:\n'Open Weather' • 'Scan Crop' • 'Check Soil'\n'Market Prices' • 'Gov Schemes' • 'Calculator'", 
    font=("Helvetica", 12), 
    fg="#888", 
    bg="#050505",
    justify="center"
)
help_text.pack(pady=20)

# Start animations 
animate_orb() 
ripple_loop() 
 
root.mainloop() 
