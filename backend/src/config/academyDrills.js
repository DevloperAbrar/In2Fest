// Built-in practice drills for the Drills library. Vendors can add their own (gym_drills table).
const d = (discipline, key, title, category, minutes, equipment, steps) => ({
    key: `${discipline}.${key}`, discipline, title, category, minutes, equipment, instructions: steps, builtin: true
  });
  
  const DRILLS = [
    d("cricket", "front_foot_drive", "Front-foot drive practice", "Batting", 20, "Bat, tennis balls, cones", "Underarm feeds at half pace. Keep the head over the front knee and finish the shot fully. 3 sets of 10 balls."),
    d("cricket", "catching_ladder", "Catching ladder", "Fielding", 15, "Cricket balls", "Pairs stand 5 m apart. Step back one pace after every 5 clean catches. Finish with one-handed catches."),
    d("cricket", "line_length", "Line and length", "Bowling", 25, "Balls, cones or target mat", "Mark a good-length spot. Bowl 6 balls per set and count the hits. 4 sets."),
    d("cricket", "between_wickets", "Running between wickets", "Fitness", 10, "Cones", "Set two lines 20 m apart. Run 3 and turn, bat grounded each time. 5 repeats, 45 s rest."),
    d("cricket", "keeper_gather", "Wicket-keeping gather", "Keeping", 15, "Gloves, balls", "Coach throws low balls from the side. Stay low, soft hands, gather and stump. 3 sets of 8."),
    d("cricket", "throw_stumps", "Throw to the stumps", "Fielding", 15, "Balls, stumps", "Field the ball, turn and throw at one stump from 15 m. Count direct hits."),
  
    d("football", "cone_dribble", "Cone dribbling", "Dribbling", 15, "Cones, balls", "Weave through 8 cones using both feet. Time each run and try to beat it."),
    d("football", "passing_triangle", "Passing triangle", "Passing", 20, "Cones, balls", "Three players pass and move to the next cone. Two touches only, then one touch."),
    d("football", "finishing", "Finishing from the edge of the box", "Shooting", 20, "Balls, goal", "Receive a pass, take one touch and shoot. Alternate feet. Count goals out of 10."),
    d("football", "rondo", "Rondo 4 v 1", "Possession", 15, "Cones, bibs", "Four players keep the ball from one defender. Swap the defender after each win."),
    d("football", "juggling", "Juggling challenge", "Ball control", 10, "Ball", "Count touches without the ball dropping. Foot, thigh and head. Record the best run."),
  
    d("badminton", "shadow_footwork", "Shadow footwork", "Footwork", 10, "Court", "Move to all six corners without a shuttle. Push off and recover to the centre each time. 4 sets of 45 s."),
    d("badminton", "multi_shuttle", "Multi-shuttle feeding", "Footwork", 15, "Shuttles", "Coach feeds to alternate corners at a steady pace. Focus on balance and a quick recovery step."),
    d("badminton", "serve_target", "Serve to target", "Serve", 15, "Shuttles, target mat", "Serve 10 to the target zone, short and long. Record how many land in the zone."),
    d("badminton", "net_kills", "Net play and kills", "Net play", 15, "Shuttles", "Tight net shot, lift, then smash the lift. Pairs, 3 minutes each."),
    d("badminton", "skipping", "Skipping intervals", "Fitness", 10, "Skipping rope", "30 s fast, 30 s rest, 10 rounds."),
  
    d("swimming", "kickboard", "Kickboard sets", "Kick", 15, "Kickboard", "4 x 25 m kick. Keep the hips high and the knees soft."),
    d("swimming", "catch_up", "Catch-up freestyle", "Technique", 15, "Pool", "One arm waits until the other finishes the stroke. 6 x 25 m."),
    d("swimming", "bilateral_breathing", "Bilateral breathing", "Breathing", 15, "Pool", "Breathe every three strokes. 6 x 25 m, steady pace."),
    d("swimming", "streamline_push", "Streamline push-offs", "Starts and turns", 10, "Pool", "Push off the wall in a tight streamline and glide to the flags. 10 repeats."),
  
    d("athletics", "acceleration_30", "30 m acceleration runs", "Sprints", 20, "Cones, stopwatch", "6 runs from a standing start with full recovery. Record every time."),
    d("athletics", "skips", "A-skips and B-skips", "Technique", 10, "Track", "2 x 20 m of each. Tall posture, quick ground contact."),
    d("athletics", "tempo_runs", "Tempo runs", "Endurance", 25, "Track", "6 x 200 m at 75% effort with 60 s walk recovery."),
  
    d("basketball", "free_throw_routine", "Free throw routine", "Shooting", 15, "Ball, hoop", "Same routine every shot. 5 sets of 10. Record makes."),
    d("basketball", "figure_eight", "Figure-eight dribble", "Dribbling", 10, "Ball", "Dribble in a figure eight between the legs. 3 x 30 s each hand pattern."),
    d("tennis", "cross_court", "Cross-court rally", "Groundstrokes", 20, "Balls, court", "Rally cross court and count the longest rally. Switch to down the line after 10 minutes."),
    d("tennis", "serve_boxes", "Serve to boxes", "Serve", 15, "Balls", "Serve 10 to each service box. Record how many land in."),
    d("skating", "cone_weave", "Cone weave", "Skills", 15, "Cones, skates", "Weave through 10 cones, then repeat on one foot. Time each run."),
  
    d("yoga", "sun_salutation", "Surya Namaskar flow", "Flow", 15, "Mat", "6 rounds at a steady breath. Slow down in the last two rounds."),
    d("yoga", "balance_series", "Standing balance series", "Balance", 10, "Mat", "Tree, eagle and warrior III, 30 s each side. Focus on a fixed point."),
    d("yoga", "pranayama", "Pranayama basics", "Breathing", 10, "Mat", "Anulom vilom, 5 minutes, then 3 minutes of deep belly breathing."),
    d("martial_arts", "stance_footwork", "Stance and footwork", "Basics", 15, "Mat", "Move forward, back and sideways in a fighting stance without crossing the feet."),
    d("martial_arts", "pad_combos", "Pad combinations", "Striking", 20, "Focus pads", "3-strike combinations in 3-minute rounds, 1 minute rest."),
    d("martial_arts", "form_repeat", "Form (kata) repetition", "Forms", 20, "Mat", "Perform the current form 5 times, slow then full speed."),
    d("dance", "isolation_warmup", "Body isolation warm-up", "Warm-up", 10, "None", "Head, shoulders, ribs and hips, 8 counts each, slow then fast."),
    d("dance", "count_practice", "Counts and rhythm practice", "Rhythm", 15, "Music", "Clap and step to 8-count patterns at three speeds."),
    d("music", "scale_practice", "Scale and sargam practice", "Technique", 15, "Instrument", "Slow scales up and down, then at double speed. Keep the pitch clean."),
    d("music", "taal_clap", "Taal clapping", "Rhythm", 10, "None", "Clap the taal with khali and sam marked. Repeat 10 cycles.")
  ];
  
  const list = (group, discipline) => {
    const D = require("./academyDisciplines");
    return DRILLS.filter((x) => D.isAllowed(group, x.discipline) && (!discipline || x.discipline === discipline));
  };
  
  module.exports = { list };