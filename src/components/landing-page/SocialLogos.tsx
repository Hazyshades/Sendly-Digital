import { useMemo } from "react"
import AutoScroll from "embla-carousel-auto-scroll"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"

interface Logo {
  id: string
  description: string
  image?: string
  className?: string
  element?: React.ReactNode
}

interface SocialLogosProps {
  heading?: string
  logos?: Logo[]
  className?: string
}

const defaultLogos: Logo[] = [
  {
    id: "logo-twitter",
    description: "Twitter / X",
    element: (
      <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>
    ),
  },
  {
    id: "logo-twitch",
    description: "Twitch",
    element: (
      <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
        </svg>
      </div>
    ),
  },
  {
    id: "logo-telegram",
    description: "Telegram",
    element: (
      <div className="w-16 h-16 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg
          className="w-7 h-7 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9.50039 15.0005L9.30305 18.7916C9.63343 18.7916 9.77653 18.6502 9.94861 18.4803L11.4982 16.9898L15.251 19.7367C15.9373 20.1197 16.4205 19.9285 16.6027 19.0304L18.9395 7.42573L18.9402 7.42504C19.1555 6.32428 18.5201 5.86444 17.851 6.13415L4.90234 11.1053C3.84037 11.5206 3.85629 12.1181 4.7964 12.3878L8.10118 13.3485L15.8533 8.52547C16.2199 8.28796 16.5538 8.42039 16.2799 8.6579L9.50039 15.0005Z" />
        </svg>
      </div>
    ),
  },
  {
    id: "logo-github",
    description: "GitHub",
    element: (
      <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
        </svg>
      </div>
    ),
  },
  {
    id: "logo-linkedin",
    description: "LinkedIn",
    element: (
      <div className="w-16 h-16 bg-[#0A66C2] rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      </div>
    ),
  },
  {
    id: "logo-gmail",
    description: "Gmail",
    element: (
      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow border border-gray-100 p-1.5">
        <svg className="w-full h-full" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
          <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
          <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
          <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z" />
          <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z" />
        </svg>
      </div>
    ),
  },
]

export function SocialLogos({
  heading,
  logos = defaultLogos,
  className,
}: SocialLogosProps) {
  const autoScrollPlugin = useMemo(
    () =>
      AutoScroll({
        playOnInit: true,
        speed: 1,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
        stopOnFocusIn: false,
        direction: "forward",
      }),
    []
  )

  return (
    <div className={`py-2 relative ${className || ''}`}>
      {heading && (
        <div className="container flex flex-col items-center text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            {heading}
          </h2>
        </div>
      )}
      <div className="pt-4 md:pt-6 w-full overflow-hidden flex justify-center">
        <div className="relative w-full max-w-3xl px-1">
          <div className="relative overflow-hidden">
            <Carousel
              opts={{
                loop: true,
                align: "center",
                slidesToScroll: 1,
                duration: 20,
              }}
              plugins={[autoScrollPlugin]}
              className="w-full"
            >
              <CarouselContent className="ml-0 -mr-2">
                {logos.map((logo) => (
                  <CarouselItem
                    key={logo.id}
                    className="basis-1/3 pl-0 pr-0 flex items-center justify-center"
                  >
                    <div className="flex items-center justify-center h-20 w-full px-1">
                      <div className="transform hover:scale-110 transition-transform duration-300 cursor-pointer flex items-center justify-center">
                        {logo.element || (
                          <img
                            src={logo.image}
                            alt={logo.description}
                            className={logo.className || "h-16 w-16"}
                          />
                        )}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#F4F2FD] to-transparent pointer-events-none z-10"></div>
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#F4F2FD] to-transparent pointer-events-none z-10"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
