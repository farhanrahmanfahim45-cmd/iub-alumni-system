import { Hero } from "../components/sections/Hero";
import { SelectedWork } from "../components/sections/SelectedWork";
import { Capabilities } from "../components/sections/Capabilities";
import { Approach } from "../components/sections/Approach";
import { About } from "../components/sections/About";
import { ExperienceSection } from "../components/sections/ExperienceSection";
import { Recognition } from "../components/sections/Recognition";
import { Creative } from "../components/sections/Creative";
import { Contact } from "../components/sections/Contact";

export function Home() {
  return (
    <>
      <Hero />
      <About />
      <ExperienceSection />
      <Recognition />
      <Capabilities />
      <Approach />
      <SelectedWork />
      <Creative />
      <Contact />
    </>
  );
}
