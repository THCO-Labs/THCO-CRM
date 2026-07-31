import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const B = "/winston-duke";
const P = `${B}/photos`;
const I = `${B}/inspiration`;
const IC = `${B}/icons`;

const CROWN_PHOTOS = [`${P}/winston_duke_003.jpg`,`${P}/winston_duke_010.jpg`,`${P}/winston_duke_025.jpg`,`${P}/winston_duke_040.jpg`];
const HAWK_PHOTOS = [`${P}/winston_duke_050.jpg`,`${P}/winston_duke_060.jpg`,`${P}/winston_duke_070.jpg`,`${P}/winston_duke_080.jpg`];
const WAVE_PHOTOS = [`${P}/winston_duke_090.jpg`,`${P}/winston_duke_100.jpg`,`${P}/winston_duke_110.jpg`,`${P}/winston_duke_120.jpg`];
const INTERLOCK_PHOTOS = [`${P}/winston_duke_005.jpg`,`${P}/winston_duke_015.jpg`,`${P}/winston_duke_030.jpg`,`${P}/winston_duke_045.jpg`];
const BRIDGE_PHOTOS = [`${P}/winston_duke_130.jpg`,`${P}/winston_duke_140.jpg`,`${P}/winston_duke_145.jpg`,`${P}/winston_duke_147.jpg`];

const GOLD = "#C9A84C";
const GREEN = "#1B4332";

// --- Reusable ---

const PhotoCollage = ({ photos }) => (
  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
    {photos.map((src, i) => (
      <div key={i} className="overflow-hidden"><img src={src} alt="" className="w-full h-full object-cover" loading="lazy" /></div>
    ))}
    <div className="absolute inset-0 bg-black/[0.87]" />
  </div>
);

const FadeIn = ({ children, delay = 0, className = "" }) => (
  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay, ease: "easeOut" }} className={className}>{children}</motion.div>
);

const SectionHeader = ({ title, subtitle, delay = 0 }) => (
  <FadeIn delay={delay} className="mb-8">
    <h2 className="text-xs tracking-[0.35em] uppercase font-light mb-1" style={{ color: GOLD }}>{title}</h2>
    <p className="text-xs text-white/35 tracking-wider font-light">{subtitle}</p>
  </FadeIn>
);

const QuoteSlide = ({ title, subtitle, photos, text, attribution }) => (
  <div className="relative flex flex-col justify-center h-full">
    <PhotoCollage photos={photos} />
    <div className="relative z-10 px-8 md:px-16 max-w-4xl mx-auto w-full">
      <SectionHeader title={title} subtitle={subtitle} />
      <FadeIn delay={0.3}>
        <div className="border-l-2 pl-6 md:pl-8" style={{ borderColor: GOLD }}>
          <p className="text-xl md:text-2xl lg:text-3xl text-white font-serif italic leading-relaxed">{text}</p>
          {attribution && <p className="mt-4 text-sm text-white/50 tracking-wider uppercase">{attribution}</p>}
        </div>
      </FadeIn>
    </div>
  </div>
);

const StorySlide = ({ title, subtitle, photos, paragraphs }) => (
  <div className="relative flex flex-col h-full">
    <PhotoCollage photos={photos} />
    <div className="relative z-10 w-full py-6 px-8 md:px-16 overflow-y-auto flex-1 scrollbar-hide">
      <div className="max-w-3xl mx-auto">
        <SectionHeader title={title} subtitle={subtitle} />
        <div className="space-y-5">
          {paragraphs.map((p, i) => (
            <FadeIn key={i} delay={0.2 + i * 0.12}>
              {p.quote ? (
                <div className="border-l-2 pl-5 my-4" style={{ borderColor: GOLD }}>
                  <p className="text-base md:text-lg text-white/90 font-serif italic leading-relaxed">{p.text}</p>
                </div>
              ) : p.emphasis ? (
                <p className="text-lg md:text-xl text-white font-serif text-center py-3 tracking-wide">{p.text}</p>
              ) : (
                <p className="text-sm md:text-base text-white/80 leading-relaxed font-light">{p.text}</p>
              )}
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ConnectionSlide = ({ title, subtitle, text }) => (
  <div className="flex flex-col justify-center h-full bg-black px-8 md:px-16">
    <div className="max-w-3xl mx-auto w-full">
      <SectionHeader title={title} subtitle={subtitle} />
      <FadeIn delay={0.3}>
        <p className="text-sm md:text-base text-white/80 leading-relaxed font-light">{text}</p>
      </FadeIn>
    </div>
  </div>
);


// ===== SLIDES =====

const Slide1 = () => (
  <div className="flex items-center justify-center h-full bg-black">
    <div className="text-center">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }}
        className="text-4xl md:text-6xl lg:text-7xl font-serif text-white tracking-[0.12em] mb-6">
        BRAND IDENTITY OF WINSTON DUKE
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 1.5 }}
        className="text-sm md:text-base tracking-[0.3em] uppercase" style={{ color: GOLD }}>
        A Brand Identity Built From Who You Already Are
      </motion.p>
    </div>
  </div>
);

const Slide2 = () => (
  <div className="relative h-full bg-black">
    <motion.img src={`${B}/Winston_Duke.webp.jpg`} alt="Winston Duke"
      className="absolute inset-0 w-full h-full object-cover object-center"
      initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2 }} />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
      <FadeIn delay={1}>
        <p className="max-w-3xl text-sm md:text-base text-white/85 leading-relaxed font-light">
          We didn't design a logo for you. We listened to everything you've told the world about who you are, in interviews, on stages, in the roles you chose and the ones you refused, and we found that your identity had already taken shape. It was hiding inside your own name.
        </p>
      </FadeIn>
    </div>
  </div>
);

const Slide3 = () => {
  const symbols = [
    { num: "1", name: "The Crown", desc: "how the world sees you (authority)" },
    { num: "2", name: "The Hawk", desc: "how you move through the world (stillness)" },
    { num: "3", name: "The Wave", desc: "where you came from (journey)" },
    { num: "4", name: "The Bridge", desc: "what you do with all of it (purpose)" },
    { num: "5", name: "The Interlock", desc: "what you contain (duality)" },
  ];
  return (
    <div className="flex flex-col justify-center h-full bg-black px-8 md:px-16">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="w-16 h-px mb-8" style={{ backgroundColor: GREEN }} />
          <p className="text-sm md:text-base text-white/80 leading-relaxed font-light mb-10">
            The logo contains five symbols. Each one maps to a specific zone in the letterforms. Each one traces back to your own words, your own journey, your own philosophy. None of this was invented. All of it was discovered.
          </p>
        </FadeIn>
        <div className="space-y-4">
          {symbols.map((s, i) => (
            <FadeIn key={i} delay={0.6 + i * 0.25}>
              <div className="flex items-baseline gap-4">
                <span className="text-xs font-mono tracking-wider" style={{ color: GOLD }}>{s.num}</span>
                <span className="text-lg md:text-xl text-white font-serif">{s.name}</span>
                <span className="text-sm text-white/40 font-light">{s.desc}</span>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  );
};

// CROWN
const Slide4 = () => <QuoteSlide title="THE CROWN" subtitle="How the world sees you (authority)" photos={CROWN_PHOTOS}
  text={`"It should always feel high-end and expensive."`} attribution="Winston Duke, on your brand aesthetic call" />;

const Slide5 = () => <StorySlide title="THE CROWN" subtitle="How the world sees you (authority)" photos={CROWN_PHOTOS} paragraphs={[
  { text: `You said that yourself, on our call, when we asked about your brand colors and your aesthetic. You didn't hesitate. Not flashy. Not loud. High-end. Expensive.` },
  { text: `Most people would hear that and think you were talking about a website. But you weren't. You were talking about a standard, a line below which nothing you put your name on should ever fall.` },
  { text: `And the world keeps confirming that standard, whether you ask for it or not.` },
  { text: `You were named King of Wakanda in Black Panther: Wakanda Forever. Not a prince. Not an advisor. The King. The person the entire nation turns to when there's no one left.` },
  { text: `You stood at the United Nations HeForShe Impact Summit and issued a global call to action for gender equality, not reading someone else's script, but speaking from the place where Mama Coco raised you and Dr. Cindy to understand what womanhood costs and what it builds.` },
  { text: `You were appointed UN Tourism Ambassador for Responsible Tourism. You were named Partners In Health's first-ever global celebrity ambassador, and you traveled to Rwanda to understand, not just to be seen. You walked the Savage X Fenty runway. GQ Australia named you Actor of the Year.` },
  { text: `These aren't supporting roles. These aren't cameos. These are positions of authority that the world placed on you because of how you show up, every time, in every room, without exception.` },
]} />;

const Slide6 = () => <ConnectionSlide title="THE CROWN" subtitle="How the world sees you (authority)"
  text={`The upward-pointing chevron at the center of your mark, the peak that rises from within the logo, is that standard made visible. It's not a crown that was given to you. It's not one you inherited. It's the one that forms naturally when everything you do rises to the same level. A crown that grows from within.`} />;

const Slide7 = () => (
  <div className="flex flex-col items-center justify-center h-full bg-black px-8 py-8">
    <SectionHeader title="THE CROWN" subtitle="How the world sees you (authority)" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl w-full">
      {[
        { src: `${I}/kling_20260411_IMAGE_I_am_attac_3206_1.png`, label: "The real-world inspiration" },
        { src: `${I}/crown_comparison.png`, label: "In black and white" },
        { src: `${I}/crown_overlay.png`, label: "Masked inside the logo shape" },
        { src: `${I}/Crown.png`, label: "The silhouette alone" },
      ].map((item, i) => (
        <FadeIn key={i} delay={0.3 + i * 0.35} className="flex flex-col items-center">
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 border border-white/10 mb-2">
            <img src={item.src} alt={item.label} className="w-full h-full object-contain p-2" loading="lazy" />
          </div>
          <p className="text-[10px] text-white/35 tracking-wider uppercase text-center">{item.label}</p>
        </FadeIn>
      ))}
    </div>
  </div>
);

// HAWK
const Slide8 = () => <QuoteSlide title="THE HAWK" subtitle="How you move through the world (stillness)" photos={HAWK_PHOTOS}
  text={`"Me being an immigrant, me being new to this space, that actually makes me really powerful in my perspective."`} attribution="Winston Duke, Okayplayer, 2018" />;

const Slide9 = () => <StorySlide title="THE HAWK" subtitle="How you move through the world (stillness)" photos={HAWK_PHOTOS} paragraphs={[
  { text: `You said that to Okayplayer in 2018. And you probably didn't realize you were describing a hawk.` },
  { text: `Think about what happens when you arrive in a new country at nine years old. You don't know the rules. You don't know the language of the streets, the shortcuts, the social codes that everyone else absorbed without thinking. So you do the only thing you can do.` },
  { text: `You watch.`, emphasis: true },
  { text: `You stand in the doorway of a Brooklyn classroom with two hundred relatives left behind in Argyle, Tobago, and you scan the room. You read the faces. You listen to the silences between the words. You learn where the power is, where the danger is, where the openings are. You don't speak first. You don't move first. You observe. You process. And only when you know, truly know, do you act.` },
  { text: `That's what a hawk does. It sits at altitude. It sees the full field, the patterns, the gaps, the movement that others miss because they're too close to the ground. It doesn't react. It reads. And when it moves, it moves with total conviction, and once it's moving, nothing stops it.` },
]} />;

const Slide10 = () => <StorySlide title="THE HAWK" subtitle="How you move through the world (stillness)" photos={HAWK_PHOTOS} paragraphs={[
  { text: `You carried that immigrant scanning into everything you became.` },
  { text: `When you prepared for Spenser Confidential, you studied Ben Foster's performance in Lone Survivor, a film directed by the same Peter Berg. You watched how Foster commanded every frame without dialogue, without movement, without noise. And you realized: the power was in what he didn't do.` },
  { text: `'Let me observe and then act. Let's plan a little bit more and then move.'`, quote: true },
  { text: `'I wanted him to feel very still, very subtle and very much grounded... he's pulling attention because he's so still.'`, quote: true },
  { text: `'You see him very still, he moves kind of slowly, but once he's moving, you can't stop him. He is the one thing that offers stability in a world that is constantly shaking.'`, quote: true },
  { text: `And then, coincidentally, beautifully, you played a character literally named Hawk. And what did you bring to him? Not choreography. Not volume. The exact same philosophy you'd been living since you were nine years old in Brooklyn, watching the room before you entered it.` },
  { text: `You didn't play Hawk. You played yourself. The immigrant who learned that the quietest person in the room is often the one who sees the most.`, emphasis: true },
]} />;

const Slide11 = () => <ConnectionSlide title="THE HAWK" subtitle="How you move through the world (stillness)"
  text={`The hawk lives in the negative space of your mark, hidden in the white gap between the letters of your name, watching in profile. Most people will see the letters first. But look closer, and the hawk is there. Beak angled downward. Eye focused. Still. Waiting. Most people won't see it at first. But once they do, they can't unsee it. Just like you in a room.`} />;

const Slide12 = () => (
  <div className="flex flex-col items-center justify-center h-full bg-black px-8 py-8">
    <SectionHeader title="THE HAWK" subtitle="How you move through the world (stillness)" />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl w-full">
      {[
        { src: `${I}/hawk_full_bird.png`, label: "The full hawk" },
        { src: `${I}/kling_20260411_IMAGE_Let_the_be_3266_1.png`, label: "The real-world inspiration" },
        { src: `${I}/hawk_comparison.png`, label: "In black and white" },
        { src: `${I}/kling_20260411_IMAGE_Let_the_be_3266_1 (1).png`, label: "The hawk head alone" },
        { src: `${I}/kling_20260411_IMAGE_Teh_beak_o_3849_0.png`, label: "Positioned to match the logo" },
        { src: `${I}/2_hawk beak.png`, label: "The silhouette shape" },
      ].map((item, i) => (
        <FadeIn key={i} delay={0.3 + i * 0.35} className="flex flex-col items-center">
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 border border-white/10 mb-2">
            <img src={item.src} alt={item.label} className="w-full h-full object-contain p-2" loading="lazy" />
          </div>
          <p className="text-[10px] text-white/35 tracking-wider uppercase text-center">{item.label}</p>
        </FadeIn>
      ))}
    </div>
  </div>
);

// WAVE
const Slide13 = () => <QuoteSlide title="THE WAVE" subtitle="Where you came from (journey)" photos={WAVE_PHOTOS}
  text={`"Argyle, Tobago to Flatbush, Brooklyn. The crossing that made you."`} />;

const Slide14 = () => <StorySlide title="THE WAVE" subtitle="Where you came from (journey)" photos={WAVE_PHOTOS} paragraphs={[
  { text: `You were born in the village of Argyle, Tobago. Not Trinidad. Tobago. An island small enough that the ocean isn't scenery. It's infrastructure. It's how food arrives, how people leave, how stories travel. The water isn't something you visit on weekends. It's the thing that shapes everything: the economy, the culture, the rhythm of daily life.` },
  { text: `'I'm from the Caribbean. One of the reasons I think Caribbean people are always late or slow-moving is because they know they're on an island.'`, quote: true },
  { text: `At nine years old, you crossed that ocean. You left behind over two hundred relatives in your village, aunts, uncles, cousins, a whole world that knew your name before you could speak it, for a new country where it was just you, Mama Coco, and Dr. Cindy. Three people where there used to be two hundred.` },
  { text: `You've talked about those early years as feeling 'a bit like an outsider... like I'm misunderstood.' A kid from a Caribbean village landing in Flatbush, Brooklyn, carrying an accent and a worldview that nobody around you shared. The foundations shook. Everything you knew about how the world worked had to be rebuilt from scratch.` },
  { text: `But you didn't let that break you. You reframed it.` },
  { text: `'Me being an immigrant, me being new to this space, that actually makes me really powerful in my perspective.'`, quote: true },
  { text: `That's not denial. That's alchemy. Taking the thing that isolated you and turning it into the thing that elevates you. The outsider's perspective isn't a weakness. It's a vantage point. You see what insiders miss because you were never given the luxury of not paying attention.` },
]} />;

const Slide15 = () => <ConnectionSlide title="THE WAVE" subtitle="Where you came from (journey)"
  text={`The sweeping curve of the logo is that wave, the Caribbean current that carried you from an island village to a global stage. It's the most fluid line in the entire mark, and it carries the same energy as that crossing: constant, quiet, and shaping everything it touches. The wave doesn't crash. It doesn't announce itself. It just keeps moving, keeps shaping the shore, keeps arriving. That's your journey. Not a single dramatic moment. A constant current that never stops.`} />;

const Slide16 = () => (
  <div className="flex flex-col items-center justify-center h-full bg-black px-8 py-8">
    <SectionHeader title="THE WAVE" subtitle="Where you came from (journey)" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl w-full">
      {[
        { src: `${I}/kling_20260411_IMAGE_I_am_attac_3284_1.png`, label: "The real-world inspiration" },
        { src: `${I}/wave_comparison.png`, label: "In black and white" },
        { src: `${I}/kling_20260411_IMAGE_Let_the_wa_3438_0 (1).png`, label: "Masked inside the logo shape" },
        { src: `${I}/Wave.png`, label: "The silhouette alone" },
      ].map((item, i) => (
        <FadeIn key={i} delay={0.3 + i * 0.35} className="flex flex-col items-center">
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 border border-white/10 mb-2">
            <img src={item.src} alt={item.label} className="w-full h-full object-contain p-2" loading="lazy" />
          </div>
          <p className="text-[10px] text-white/35 tracking-wider uppercase text-center">{item.label}</p>
        </FadeIn>
      ))}
    </div>
  </div>
);

// INTERLOCK
const Slide17 = () => <QuoteSlide title="THE INTERLOCK" subtitle="What you contain (duality)" photos={INTERLOCK_PHOTOS}
  text={`"It's duality. It's accepting light. It's accepting dark. It's accepting the light and the shadow."`} attribution="Winston Duke, WNYC Interview" />;

const Slide18 = () => <StorySlide title="THE INTERLOCK" subtitle="What you contain (duality)" photos={INTERLOCK_PHOTOS} paragraphs={[
  { text: `Those are your exact words, from your WNYC interview about Nine Days. You weren't describing a character. You weren't workshopping a role. You were describing the way you move through the world.` },
  { text: `'I've never wanted to be trapped.'`, quote: true },
  { text: `That's the key. Most people pick a lane. They're the tough guy or the intellectual. The Caribbean man or the American actor. The blockbuster star or the indie artist. The warrior or the nurturer. You refuse to choose because choosing one means killing the other, and you know that the thing that makes you powerful is that you carry all of them simultaneously.` },
  { text: `Tobago and Brooklyn. The 6'5" frame and the Yale School of Drama training. The man who loves battle rap for the 'strategic linguistic combat' and then stands at the United Nations advocating for gender equality.` },
  { text: `'I like changing my body, because I never like wondering what I'm doing when I'm not moving, when I'm not saying anything. If my body's wider, if it's heavier, if it's lighter, if it's all those kinds of things, it functions differently in space.'`, quote: true },
  { text: `You don't just play different characters. You become different physics. M'Baku was 'an engine, a well-tuned warrior archetype.' Gabe from Us was 'a weekend warrior, slower, more bouncy and can be playful.' Hawk was a pillar of stillness. Will was 'a wounded child inside the artifice of a badass warrior.'` },
  { text: `Different bodies. Different breath. Different gravity. Same soul.`, emphasis: true },
]} />;

const Slide19 = () => (
  <div className="flex flex-col justify-center h-full bg-black px-8 md:px-16">
    <div className="max-w-3xl mx-auto w-full">
      <SectionHeader title="THE INTERLOCK" subtitle="What you contain (duality)" />
      <FadeIn delay={0.2}>
        <p className="text-sm md:text-base text-white/80 leading-relaxed font-light mb-5">
          The interlock in your mark, the shared spine where two sides of the logo fuse into one inseparable stroke, is two things becoming one. And when we thought about how to represent this visually, we knew it had to come from nature. Because you are a man who respects living things, an ambassador for the natural world.
        </p>
      </FadeIn>
      <FadeIn delay={0.5}>
        <div className="border-l-2 pl-5 my-6" style={{ borderColor: GOLD }}>
          <p className="text-base md:text-lg text-white/90 font-serif italic leading-relaxed">
            'I'm an animal person altogether, but I don't own any because I don't love the idea of owning animals. If they want to run away, they should be able to.'
          </p>
        </div>
      </FadeIn>
      <FadeIn delay={0.8}>
        <p className="text-sm md:text-base text-white/80 leading-relaxed font-light">
          So we chose two trees growing together in a Caribbean forest, their separate trunks merging into a single base. Nature doesn't force things together. It lets them grow in the same soil until they find each other. That's what the interlock is. Not forced fusion. Natural convergence. Two things that grew side by side until separation became impossible. Your mark does exactly that: two letters, two identities, one structure that cannot be pulled apart.
        </p>
      </FadeIn>
    </div>
  </div>
);

const Slide20 = () => (
  <div className="flex flex-col items-center justify-center h-full bg-black px-8 py-8">
    <SectionHeader title="THE INTERLOCK" subtitle="What you contain (duality)" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl w-full">
      {[
        { src: `${I}/kling_20260411_IMAGE_Show_me_se_3252_1.png`, label: "The real-world inspiration" },
        { src: `${I}/interlock_trees_comparison.png`, label: "In black and white" },
        { src: `${I}/kling_20260411_IMAGE_Using_the__3845_0.png`, label: "Masked inside the logo shape" },
        { src: `${I}/Interlock b.png`, label: "The silhouette alone" },
      ].map((item, i) => (
        <FadeIn key={i} delay={0.3 + i * 0.35} className="flex flex-col items-center">
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 border border-white/10 mb-2">
            <img src={item.src} alt={item.label} className="w-full h-full object-contain p-2" loading="lazy" />
          </div>
          <p className="text-[10px] text-white/35 tracking-wider uppercase text-center">{item.label}</p>
        </FadeIn>
      ))}
    </div>
  </div>
);

// BRIDGE
const Slide21 = () => <QuoteSlide title="THE BRIDGE" subtitle="What you do with all of it (purpose)" photos={BRIDGE_PHOTOS}
  text={`"That's how we really connected."`} attribution="Winston Duke, WNYC Interview" />;

const Slide22 = () => <StorySlide title="THE BRIDGE" subtitle="What you do with all of it (purpose)" photos={BRIDGE_PHOTOS} paragraphs={[
  { text: `You said that on WNYC, talking about how you and Edson Oda, the director of Nine Days, found each other. Not through agents or auditions, but through a shared understanding of what it means to be an immigrant navigating a world that wasn't built for you.` },
  { text: `'We really connected through the immigrant experience and the nuances of that immigrant experience.'`, quote: true },
  { text: `That's what you do. Not just in that one conversation, but in everything. You connect worlds that don't know they belong together.` },
  { text: `You connect Tobago to Hollywood. You connect the block in Brooklyn to the halls of Yale. You connect a superhero franchise to a conversation about grief. You connect a Netflix action comedy to a meditation on masculinity. You connect the Caribbean diaspora to the global stage, not by representing one to the other, but by being the point where they meet.` },
  { text: `Your performances don't just represent. They connect audiences to emotions they couldn't reach on their own. You are the doorway. You are the span across the gap.` },
  { text: `Crown is about standard. Hawk is about stillness. Wave is about journey. Interlock is about duality. But Bridge is about purpose: why you exist between those two worlds. You don't just contain contradictions. You connect them for other people. You make the crossing possible for someone who has never left their shore.`, emphasis: true },
]} />;

const Slide23 = () => <ConnectionSlide title="THE BRIDGE" subtitle="What you do with all of it (purpose)"
  text={`The center span of your mark, the diagonal stroke that bridges both sides of the logo across two open gaps, is that connection made structural. On either side of it, there's open space. Without the bridge, both sides of the mark collapse. With it, everything holds together. That's what you do, Winston. You hold worlds together. And you make it look like they were never apart.`} />;

const Slide24 = () => (
  <div className="flex flex-col items-center justify-center h-full bg-black px-8 py-8">
    <SectionHeader title="THE BRIDGE" subtitle="What you do with all of it (purpose)" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl w-full">
      {[
        { src: `${I}/kling_20260411_IMAGE_Let_the_br_3267_1.png`, label: "The real-world inspiration" },
        { src: `${I}/bridge_comparison.png`, label: "In black and white" },
        { src: `${I}/kling_20260411_IMAGE_Using_the__3817_1.png`, label: "Masked inside the logo shape" },
        { src: `${I}/Bridge.png`, label: "The silhouette alone" },
      ].map((item, i) => (
        <FadeIn key={i} delay={0.3 + i * 0.35} className="flex flex-col items-center">
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 border border-white/10 mb-2">
            <img src={item.src} alt={item.label} className="w-full h-full object-contain p-2" loading="lazy" />
          </div>
          <p className="text-[10px] text-white/35 tracking-wider uppercase text-center">{item.label}</p>
        </FadeIn>
      ))}
    </div>
  </div>
);

// REVEAL SEQUENCE

// Step 1: Countdown/Anticipation
const Slide25 = () => (
  <div className="flex items-center justify-center h-full bg-black">
    <div className="text-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}>
        <p className="text-sm tracking-[0.4em] uppercase text-white/30 mb-6">And now</p>
      </motion.div>
      <motion.h2 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, delay: 1.2 }}
        className="text-4xl md:text-6xl font-serif text-white tracking-wider">
        Your Mark
      </motion.h2>
      <motion.div initial={{ width: 0 }} animate={{ width: 80 }} transition={{ duration: 1, delay: 2.5 }}
        className="h-px mx-auto mt-8" style={{ backgroundColor: GOLD }} />
    </div>
  </div>
);

// Step 2: The Logo Reveal (first time seeing it)
const Slide26 = () => (
  <div className="flex items-center justify-center h-full bg-black">
    <FadeIn>
      <div className="w-72 h-72 md:w-[28rem] md:h-[28rem]">
        <img src={`${B}/Winston_Duke_Final_Logo.webp`} alt="Winston Duke Logo" className="w-full h-full object-contain" loading="lazy" />
      </div>
    </FadeIn>
  </div>
);

// Step 3: Five Symbols, Five Zones (annotated logos now)
const Slide27 = () => {
  const zones = [
    { src: `${IC}/1_crown_zone_chevron.png`, label: "Crown" },
    { src: `${IC}/2_hawk_zone.png`, label: "Hawk" },
    { src: `${IC}/3_wave_zone.png`, label: "Wave" },
    { src: `${IC}/4_bridge_zone.png`, label: "Bridge" },
    { src: `${IC}/5_interlock_zone.png`, label: "Interlock" },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black px-8">
      <FadeIn>
        <p className="text-lg md:text-xl text-white font-serif text-center mb-10 tracking-wide">Five symbols. Five zones. One mark.</p>
      </FadeIn>
      <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
        {zones.map((z, i) => (
          <FadeIn key={i} delay={0.4 + i * 0.3} className="flex flex-col items-center">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden bg-black border border-white/10">
              <img src={z.src} alt={z.label} className="w-full h-full object-contain p-1" loading="lazy" />
            </div>
            <p className="text-xs text-white/40 mt-2 tracking-wider uppercase">{z.label}</p>
          </FadeIn>
        ))}
      </div>
      <FadeIn delay={2}>
        <div className="w-40 h-40">
          <img src={`${I}/6_all_combined.png`} alt="All combined" className="w-full h-full object-contain" loading="lazy" />
        </div>
        <p className="text-xs text-white/30 text-center mt-3 tracking-wider uppercase">Everything converges</p>
      </FadeIn>
    </div>
  );
};

// Step 4: The Closing Text
const Slide28 = () => (
  <div className="flex flex-col justify-center h-full bg-black px-8 md:px-16">
    <div className="max-w-3xl mx-auto space-y-6">
      {[
        `We started by listening to everything you've told the world about who you are.`,
        `We found five pillars: a standard you set, a stillness you carry, a crossing you made, a purpose you serve, and a duality you contain.`,
        `We found five symbols in nature and in the world: a crown, a hawk, a wave, two trees growing into one, and a bridge spanning open water.`,
        `We found that each of these symbols, when shaped to match its meaning, aligns precisely to a specific zone inside the logo, inside the letters of your own name.`,
        `The crown rises from within. The hawk hides in the negative space between the letters. The wave curves through. The bridge spans the center. The trees interlock at the shared spine.`,
      ].map((t, i) => (
        <FadeIn key={i} delay={i * 0.35}>
          <p className="text-sm md:text-base text-white/80 leading-relaxed font-light">{t}</p>
        </FadeIn>
      ))}
      <FadeIn delay={2}>
        <p className="text-xl md:text-2xl text-white font-serif text-center py-6">We didn't design this logo.</p>
      </FadeIn>
      <FadeIn delay={2.8}>
        <p className="text-sm md:text-base text-white/80 leading-relaxed font-light text-center">
          We found it inside what you've already told the world about who you are. And now, you'll never look at it without seeing all of it.
        </p>
      </FadeIn>
    </div>
  </div>
);

// Step 5: The Logo Again (final)
const Slide29 = () => (
  <div className="flex items-center justify-center h-full bg-black">
    <FadeIn>
      <div className="w-72 h-72 md:w-[28rem] md:h-[28rem]">
        <img src={`${B}/Winston_Duke_Final_Logo.webp`} alt="Winston Duke Logo" className="w-full h-full object-contain" loading="lazy" />
      </div>
    </FadeIn>
  </div>
);

// Step 6: Closing Quote
const Slide30 = () => (
  <div className="flex items-center justify-center h-full bg-black">
    <FadeIn>
      <div className="max-w-3xl mx-auto px-8 text-center">
        <p className="text-xl md:text-2xl lg:text-3xl text-white font-serif italic leading-relaxed mb-8">
          "I got into acting to escape and play... I want to live in my imagination, but I want that play to do the grieving and painful work that others can't always do."
        </p>
        <div className="w-12 h-px mx-auto mb-4" style={{ backgroundColor: GOLD }} />
        <p className="text-sm tracking-[0.3em] uppercase" style={{ color: GOLD }}>Winston Duke</p>
      </div>
    </FadeIn>
  </div>
);

const SLIDES = [Slide1,Slide2,Slide3,Slide4,Slide5,Slide6,Slide7,Slide8,Slide9,Slide10,Slide11,Slide12,Slide13,Slide14,Slide15,Slide16,Slide21,Slide22,Slide23,Slide24,Slide17,Slide18,Slide19,Slide20,Slide25,Slide26,Slide27,Slide28,Slide29,Slide30];

export default function WinstonDukePresentation() {
  const [slide, setSlide] = useState(0);
  const goNext = useCallback(() => setSlide(s => Math.min(s + 1, SLIDES.length - 1)), []);
  const goPrev = useCallback(() => setSlide(s => Math.max(s - 1, 0)), []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  const touchStart = useRef(0);
  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
  };

  const CurrentSlide = SLIDES[slide];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none"
      style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      data-testid="winston-duke-presentation">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&display=swap');
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .font-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .font-light { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 300; }
      `}</style>

      <AnimatePresence mode="wait">
        <motion.div key={slide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }} className="w-full h-full">
          <CurrentSlide />
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-50">
        <button onClick={goPrev} disabled={slide === 0}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 disabled:opacity-20 transition-all"
          data-testid="prev-slide"><ChevronLeft size={18} /></button>
        <span className="text-xs font-mono text-white/30 tabular-nums min-w-[60px] text-center">{slide + 1} / {SLIDES.length}</span>
        <button onClick={goNext} disabled={slide === SLIDES.length - 1}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 disabled:opacity-20 transition-all"
          data-testid="next-slide"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
