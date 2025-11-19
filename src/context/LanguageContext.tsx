import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "pl";

interface Translations {
  [key: string]: {
    en: string;
    pl: string;
  };
}

const translations: Translations = {
  // Landing Page
  "landing.title": {
    en: "Sen",
    pl: "Sen",
  },
  "landing.subtitle": {
    en: "A game of dreams and crows.",
    pl: "Gra o snach i wronach.",
  },
  "landing.enterButton": {
    en: "Enter the Dream",
    pl: "Wejdź do Snu",
  },

  // Lobby Screen - Main
  "lobby.title": {
    en: "Sen",
    pl: "Sen",
  },
  "lobby.subtitle": {
    en: "A game of dreams and crows.",
    pl: "Gra o snach i wronach.",
  },
  "lobby.onlineMultiplayer": {
    en: "Online Multiplayer",
    pl: "Gra Online",
  },
  "lobby.localHotSeat": {
    en: "Local Hot-Seat",
    pl: "Gra Lokalna",
  },

  // Online Mode
  "online.title": {
    en: "Online Multiplayer",
    pl: "Gra Online",
  },
  "online.subtitle": {
    en: "Join or Create a 2-Player Game",
    pl: "Dołącz lub Stwórz Grę 2-Osobową",
  },
  "online.roomId": {
    en: "Room ID",
    pl: "ID Pokoju",
  },
  "online.shareId": {
    en: "Share this ID with your friend",
    pl: "Udostępnij ten ID znajomemu",
  },
  "online.players": {
    en: "Players",
    pl: "Gracze",
  },
  "online.waitingForOpponent": {
    en: "Waiting for opponent...",
    pl: "Oczekiwanie na przeciwnika...",
  },
  "online.host": {
    en: "HOST",
    pl: "GOSPODARZ",
  },
  "online.waitingForHost": {
    en: "Waiting for host to start...",
    pl: "Oczekiwanie na start od gospodarza...",
  },
  "online.yourName": {
    en: "Your Name",
    pl: "Twoje Imię",
  },
  "online.enterYourName": {
    en: "Enter your name",
    pl: "Wpisz swoje imię",
  },
  "online.createNewGame": {
    en: "Create New Game",
    pl: "Stwórz Nową Grę",
  },
  "online.creating": {
    en: "Creating...",
    pl: "Tworzenie...",
  },
  "online.orJoinExisting": {
    en: "Or Join Existing",
    pl: "Lub Dołącz do Istniejącej",
  },
  "online.roomIdLabel": {
    en: "Room ID",
    pl: "ID Pokoju",
  },
  "online.enterRoomId": {
    en: "Enter Room ID",
    pl: "Wpisz ID Pokoju",
  },
  "online.join": {
    en: "Join",
    pl: "Dołącz",
  },
  "online.startGame": {
    en: "Start Game",
    pl: "Rozpocznij Grę",
  },
  "online.waitingForPlayers": {
    en: "Waiting for Players...",
    pl: "Oczekiwanie na Graczy...",
  },

  // Hot-Seat Mode
  "hotseat.title": {
    en: "Local Hot-Seat",
    pl: "Gra Lokalna",
  },
  "hotseat.subtitle": {
    en: "Play on one device",
    pl: "Gra na jednym urządzeniu",
  },
  "hotseat.player": {
    en: "Player",
    pl: "Gracz",
  },
  "hotseat.enterPlayerName": {
    en: "Enter Player {0}'s name",
    pl: "Wpisz imię Gracza {0}",
  },
  "hotseat.remove": {
    en: "Remove",
    pl: "Usuń",
  },
  "hotseat.addPlayer": {
    en: "+ Add Player",
    pl: "+ Dodaj Gracza",
  },
  "hotseat.startGame": {
    en: "Start Game",
    pl: "Rozpocznij Grę",
  },

  // Tutorial
  "tutorial.welcome": {
    en: "Welcome to Sen!",
    pl: "Witaj w Sen!",
  },
  "tutorial.firstTime": {
    en: "It looks like this is your first time. Would you like a quick tutorial?",
    pl: "Wygląda na to, że jesteś tu pierwszy raz. Chcesz szybki samouczek?",
  },
  "tutorial.noThanks": {
    en: "No, thanks",
    pl: "Nie, dziękuję",
  },
  "tutorial.yesPlease": {
    en: "Yes, please!",
    pl: "Tak, poproszę!",
  },

  // Toast Messages
  "toast.roomIdCopied": {
    en: "Room ID copied to clipboard!",
    pl: "ID pokoju skopiowane do schowka!",
  },
  "toast.enterName": {
    en: "Please enter your name.",
    pl: "Proszę wpisać swoje imię.",
  },
  "toast.createRoomError": {
    en: "Could not create room. Please check your connection.",
    pl: "Nie można utworzyć pokoju. Sprawdź swoje połączenie.",
  },
  "toast.enterRoomId": {
    en: "Please enter a Room ID.",
    pl: "Proszę wpisać ID pokoju.",
  },
  "toast.enterAllPlayerNames": {
    en: "Please enter names for all players.",
    pl: "Proszę wpisać imiona wszystkich graczy.",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem("language");
    if (stored === "en" || stored === "pl") {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>) => {
    const translation = translations[key]?.[language] || key;
    
    if (!replacements) {
      return translation;
    }

    // Replace placeholders like {0}, {1}, etc.
    return Object.entries(replacements).reduce((text, [placeholder, value]) => {
      return text.replace(`{${placeholder}}`, String(value));
    }, translation);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
